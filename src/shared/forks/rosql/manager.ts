import { now } from "shared/utility/time";
import { RoSQLParser } from "./parser";
import type {
	ConditionalTableType,
	DatabaseType,
	DataFileType,
	DatastoreSQLConfig,
	RoSQLDecryption,
	RoSQLEncryption,
	RoSQLGetter,
	RoSQLManagerListeners,
	RoSQLNativeTypesType,
	RoSQLNeeds,
	ROSQLOptionsArchitecture,
	RoSQLRemover,
	RoSQLSetter,
	RoSQLUpdater,
} from "./typings/rosql-types";
import { getROSQLConfig } from "./utils/functions";
import { errorFormat } from "./utils/logger";
import { checkMatchCondition } from "./utils/parse";
import { RoSQLResolver } from "./utils/resolver";
import Signal from "@rbxts/signal";
import Object, { deepCopy } from "@rbxts/object-utils";
import { Players } from "@rbxts/services";
import { ReconcileUnadded } from "shared/utility/instance";
import { SQLEnums } from "./enums";
import { trim } from "@rbxts/string-utils";
import { Express } from "shared/classes/express";

export abstract class RoSQLManager extends RoSQLParser {
	public readonly types = SQLEnums;
	public readonly referenceDataFile: Maybe<DataFileType>;
	public readonly type: DatabaseType;
	public readonly configuration: DatastoreSQLConfig;
	public readonly databaseMethods: {
		get: RoSQLGetter;
		set: RoSQLSetter;
		updateAsync: RoSQLUpdater;
		remove: RoSQLRemover;
	};
	public encryption: RoSQLEncryption;
	public decryption: RoSQLDecryption;
	protected readonly resolver: RoSQLResolver = new RoSQLResolver();
	protected readonly listeners: RoSQLManagerListeners = { coroutine: new Signal() };
	protected readonly connections: Record<number, RBXScriptConnection> = {};
	private readonly playerTable: Map<Player, DataFileType> = new Map();
	private readonly activeSavePromises = new Set<Promise<void>>();
	private readonly express: Express = new Express({ threadCap: 5 });
	private readonly queues = {
		autocommit: false,
	};
	constructor(needs: RoSQLNeeds) {
		super();
		this.configuration = getROSQLConfig(needs.configuration);
		if (needs.encryption && !this.configuration.allowDataEncryption)
			throw errorFormat(`Encryption is provided, but allowDataEncryption is disabled.`);
		if (needs.decryption && !this.configuration.allowDataDecryption)
			throw errorFormat(`Decryption is provided, but allowDataDecryption is disabled.`);
		this.encryption = needs.encryption ? needs.encryption : this.resolver.getEncryption();
		this.decryption = needs.decryption ? needs.decryption : this.resolver.getDecryption();
		this.referenceDataFile = needs.referenceDataTable && needs.referenceDataTable;
		if (needs.referenceDataTable && !this.configuration.allowAutoDataManagement)
			throw errorFormat(`Reference data file is provided, but allowAutoDataManagement is disabled.`);
		const [_type, get, set, remove, update] = this.resolver.resolveDatabaseType(needs.database, this).expect();
		this.type = _type;
		this.databaseMethods = {
			get,
			set,
			remove,
			updateAsync: update,
		};
		this.enableListeners();
		this.readAndActionConfig();
	}

	public async registerPlayer<D extends DataFileType>(
		player: Player,
		forceData: boolean = true,
	): Promise<[D, boolean, string]> {
		const existing = this.getPlayerData(player);
		if (existing) return [<D>existing, true, ""];
		if (!this.referenceDataFile) throw errorFormat("Reference data file is not defined.");
		const copy = deepCopy(this.referenceDataFile);
		const core = this.express.get(`registerPlayer-${player.UserId}`);
		// eslint-disable-next-line no-useless-assignment
		let [data, success, response]: [D, boolean, string] = [<D>{}, false, ""];
		if (core) {
			[data, success, response] = <[D, boolean, string]>await core.core;
		} else {
			this.express.add(`registerPlayer-${player.UserId}`, async () => {
				return await this.select(["*"], {
					["userId"]: {
						value: tostring(player.UserId),
						symbol: "=",
					},
				})
					.then((data) => {
						return [data[0], true, ""];
					})
					.catch((err) => {
						warn(`FOUND ERROR: ${err}`);
						return [{}, false, `Failed to fetch data for player ${player.Name}: ${err}`];
					});
			});

			[data, success, response] = <[D, boolean, string]>(
				await this.express.start(`registerPlayer-${player.UserId}`)!.core
			);
		}
		this.express.remove(`registerPlayer-${player.UserId}`);
		if (!success) return [<D>data, <boolean>success, <string>response];
		if (data) ReconcileUnadded(<Record<string, unknown>>data, <Record<string, unknown>>copy);
		data ??= forceData ? <D>copy : <D>{};
		this.playerTable.set(player, data);
		return [<D>data, true, ""];
	}

	public async savePlayerData(player: Player, data?: object): Promise<void> {
		const savePromise = (async () => {
			data ??= this.playerTable.get(player);
			if (!data) throw errorFormat(`Player ${player.Name} is not registered.`);
			data[<never>"userId"] = <never>player.UserId;
			print(`[ROSQL] Saving data for ${player.Name} (${player.UserId}).`);
			await this.updateNative(data, "userId").catch((err) => error(err));
			print(`[ROSQL] Saved data for ${player.Name} (${player.UserId}).`);
		})();

		this.activeSavePromises.add(savePromise);
		try {
			await savePromise;
		} catch (err) {
			error(err);
		} finally {
			this.activeSavePromises.delete(savePromise);
		}
	}

	public async deregisterPlayer(player: Player, save: boolean): Promise<void> {
		print(`[ROSQL] deregisterPlayer called for ${player.Name} (${player.UserId}) save=${save}`);
		if (!this.playerTable.has(player)) {
			print(`[ROSQL] deregisterPlayer: ${player.Name} not in playerTable, skipping`);
			return;
		}
		if (save) await this.savePlayerData(player);
		this.playerTable.delete(player);
	}

	public getPlayerData<D extends DataFileType>(player: Player): Maybe<D> {
		return <Maybe<D>>this.playerTable.get(player);
	}

	private getActiveSavePromises(): Promise<void>[] {
		const promises: Promise<void>[] = [];
		for (const promise of this.activeSavePromises) promises.push(promise);
		return promises;
	}

	public async commit(commitName?: string, tableName: string = this.configuration.databaseName): Promise<unknown> {
		return await this.executeCommand("COMMIT", {
			tableName,
			values: commitName ? [commitName] : [],
		});
	}

	public async rollback(commitName?: string, tableName: string = this.configuration.databaseName): Promise<unknown> {
		return await this.executeCommand("ROLLBACK", {
			tableName,
			values: commitName ? [commitName] : [],
		});
	}

	public async create(
		entries: Record<string, (RoSQLNativeTypesType | number)[]>,
		tableName: string = this.configuration.databaseName,
	): Promise<unknown> {
		const columns: string[] = [];
		for (const [name, entry] of pairs(entries)) {
			let column = `${name}`;
			// Automatically turn the type into a parenthesis type if theres more than 2 entries in the array
			const entrySize = entry.size();
			if (entrySize > 1) {
				column += ` ${entry
					.map((value, index) => {
						return index === 0 ? `${value}(` : index === entrySize - 1 ? `${value})` : `${value}, `;
					})
					.join("")}`;
			} else {
				column += ` ${entry.join(",\n")}`;
			}
			columns.push(trim(column));
		}
		return await this.executeCommand("CREATE", { tableName, columns });
	}

	public async drop(tableName: string = this.configuration.databaseName): Promise<unknown> {
		return await this.executeCommand("DROP", { tableName });
	}

	public async select<T extends DataFileType[]>(
		columns: string[],
		conditions?: Record<string, ConditionalTableType>,
		tableName: string = this.configuration.databaseName,
	): Promise<T> {
		return await this.executeCommand<T>("SELECT", { tableName, columns, conditions });
	}

	public async insert(tableName: string, columns: string[], values: string[]): Promise<unknown> {
		return await this.executeCommand("INSERT", { tableName, columns, values });
	}

	public async update(
		setClauses: Record<string, ConditionalTableType>,
		conditions?: Record<string, ConditionalTableType>,
		tableName: string = this.configuration.databaseName,
	): Promise<unknown> {
		return await this.executeCommand("UPDATE", { tableName, setClauses, conditions });
	}

	public async updateNative(
		data: object,
		primaryKey: string = this.configuration.primaryKeyName,
		tableName: string = this.configuration.databaseName,
	): Promise<unknown> {
		if (!(primaryKey in data)) throw errorFormat(`Primary key '${primaryKey}' is missing from the provided data.`);
		const primaryValue = data[<never>primaryKey];
		if (this.configuration.allowEnforcePrimaryKeyForFastIndexing) {
			// Fast indexing mode: store as {primaryKey: data}
			return await this.databaseMethods.updateAsync<Record<string, unknown>>(tableName, (previous) => {
				previous ??= {};
				const keyStr = tostring(primaryValue);
				previous[keyStr] = data;
				print("Successfully Updated Natively using Fast Indexing");
				return [previous];
			});
		} else {
			// Standard mode: store as array of objects
			return await this.databaseMethods.updateAsync<object[]>(tableName, (previous) => {
				previous ??= [];
				let found = false;
				for (const [index, loopData] of pairs(previous)) {
					if (
						checkMatchCondition(
							{
								[primaryKey]: {
									symbol: "=",
									value: tostring(primaryValue),
								},
							},
							<Record<string, unknown>>loopData,
						)
					) {
						previous[index - 1] = data;
						found = true;
						break;
					}
				}
				if (!found) previous.push(data);
				return [previous];
			});
		}
	}

	public async alter(
		operation: string,
		index?: string,
		indexArg?: string,
		indexArg2?: string,
		tableName: string = this.configuration.databaseName,
	): Promise<unknown> {
		const exporting = [operation, "COLUMN", index, indexArg, indexArg2].filterUndefined();
		return await this.executeCommand("ALTER", {
			tableName,
			values: <string[]>exporting.filter((value) => value !== undefined),
		});
	}

	public async open(tableName: string = this.configuration.databaseName): Promise<unknown> {
		const promises: Promise<unknown>[] = [];
		if (this.configuration.allowSetAutocommit && !this.queues.autocommit)
			promises.push(this.queueAutoCommit(tableName));

		return await Promise.all(promises);
	}

	private async queueAutoCommit(tableName: string = this.configuration.databaseName): Promise<void> {
		this.queues.autocommit = true;
		const existing = await this.databaseMethods.get<ROSQLOptionsArchitecture>(
			`${this.configuration.metadataPrefix}${tableName}`,
		);
		if (!existing) return;
		const lastCommit =
			this.configuration.autocommitIntervalName in existing
				? existing[this.configuration.autocommitIntervalName]
				: undefined;
		const lastTick = lastCommit ? DateTime.fromIsoDate(<string>lastCommit)?.UnixTimestampMillis : now();
		const dueTick = lastTick! + 3_600_000 * this.configuration.autocommitInterval;
		if (!(this.configuration.autocommitIntervalName in existing)) {
			if (this.configuration.allowInitialCommitFromAutoCommitFunction)
				await this.commit(this.configuration.initialAutocommitAlias, tableName);
			else
				await this.databaseMethods.set(
					`${this.configuration.metadataPrefix}${tableName}`,
					Object.assign(existing, {
						[this.configuration.autocommitIntervalName]: DateTime.now().ToIsoDate(),
					}),
				);
		}
		task.wait(math.max(dueTick - now(), 0));
		await this.commit();
		this.queues.autocommit = false;
	}

	private enableListeners(): void {
		this.listeners.coroutine.Connect(async (name) => {
			await this.open(name);
		});
	}

	private readAndActionConfig(): void {
		print(this.configuration);
		if (this.configuration.allowAutoDataManagement && this.configuration.allowAutoDataServerShutdownBackup)
			game.BindToClose(async () => {
				const promises: Promise<unknown>[] = [];
				for (const player of Players.GetPlayers())
					if (this.playerTable.has(player))
						promises.push(
							this.savePlayerData(player).catch((err) => {
								warn(`Failed to save data for player ${player.Name} on server shutdown: ${err}`);
							}),
						);
				for (const promise of this.getActiveSavePromises())
					promises.push(
						promise.catch((err) => {
							warn(`[ROSQL] Active save failed while BindToClose was waiting: ${err}`);
						}),
					);
				print(`[ROSQL] BindToClose waiting for ${promises.size()} save(s).`);
				await Promise.all(promises).catch((e) => error(e));
				print("[ROSQL] BindToClose save wait finished.");
			});
	}
}
