import { now } from "shared/utility/time";
import { RoSQLParser } from "./parser";
import {
	ConditionalTableType,
	DatabaseType,
	DataFileType,
	DatastoreSQLConfig,
	RoSQLDecryption,
	RoSQLEncryption,
	RoSQLGetter,
	RoSQLManagerListeners,
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

export abstract class RoSQLManager extends RoSQLParser {
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
		// eslint-disable-next-line prefer-const
		let [data, success, response] = await this.select(this.configuration.databaseName, ["*"], {
			["userId"]: {
				value: tostring(player.UserId),
				symbol: "=",
			},
		}).catch((err) => {
			print(`FOUND ERROR: ${err}`);
			return [{}, false, `Failed to fetch data for player ${player.Name}: ${err}`];
		});
		if (success === false) return [<D>data, <boolean>success, <string>response];
		if (data) ReconcileUnadded(<Record<string, unknown>>data, <Record<string, unknown>>copy);
		data ??= forceData ? copy : {};
		this.playerTable.set(player, data);
		return [<D>data, true, ""];
	}

	public async savePlayerData(player: Player, data?: object): Promise<void> {
		data ??= this.playerTable.get(player);
		if (!data) throw errorFormat(`Player ${player.Name} is not registered.`);
		data[<never>"userId"] = <never>player.UserId;
		await this.updateNative(this.configuration.databaseName, data, "userId");
	}

	public async deregisterPlayer(player: Player, save: boolean): Promise<void> {
		if (!this.playerTable.has(player)) throw errorFormat(`Player ${player.Name} is not registered.`);
		if (save) await this.savePlayerData(player);
		this.playerTable.delete(player);
	}

	public getPlayerData<D extends DataFileType>(player: Player): Maybe<D> {
		return <Maybe<D>>this.playerTable.get(player);
	}
	public async commit(tableName: string, commitName?: string): Promise<unknown> {
		return await this.executeCommand("COMMIT", {
			tableName,
			values: commitName ? [commitName] : [],
		});
	}

	public async rollback(tableName: string, commitName?: string): Promise<unknown> {
		return await this.executeCommand("ROLLBACK", {
			tableName,
			values: commitName ? [commitName] : [],
		});
	}

	public async create(tableName: string, columns: string[]): Promise<unknown> {
		return await this.executeCommand("CREATE", { tableName, columns });
	}

	public async drop(tableName: string): Promise<unknown> {
		return await this.executeCommand("DROP", { tableName });
	}

	public async select<T extends DataFileType[]>(
		tableName: string,
		columns: string[],
		conditions?: Record<string, ConditionalTableType>,
	): Promise<T> {
		return await this.executeCommand<T>("SELECT", { tableName, columns, conditions });
	}

	public async insert(tableName: string, columns: string[], values: string[]): Promise<unknown> {
		return await this.executeCommand("INSERT", { tableName, columns, values });
	}

	public async update(
		tableName: string,
		setClauses: Record<string, ConditionalTableType>,
		conditions?: Record<string, ConditionalTableType>,
	): Promise<unknown> {
		return await this.executeCommand("UPDATE", { tableName, setClauses, conditions });
	}

	public async updateNative(
		tableName: string,
		data: object,
		primaryKey: string = this.configuration.primaryKeyName,
	): Promise<unknown> {
		if (!(primaryKey in data)) throw errorFormat(`Primary key '${primaryKey}' is missing from the provided data.`);
		const primaryValue = data[<never>primaryKey];
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

	public async alter(
		tableName: string,
		operation: string,
		index?: string,
		indexArg?: string,
		indexArg2?: string,
	): Promise<unknown> {
		const exporting = [operation, "COLUMN", index, indexArg, indexArg2].filterUndefined();
		return await this.executeCommand("ALTER", {
			tableName,
			values: <string[]>exporting.filter((value) => value !== undefined),
		});
	}

	public async open(tableName: string): Promise<unknown> {
		const promises: Promise<unknown>[] = [];
		if (this.configuration.allowSetAutocommit && !this.queues.autocommit)
			promises.push(this.queueAutoCommit(tableName));

		return await Promise.all(promises);
	}

	private async queueAutoCommit(tableName: string): Promise<void> {
		this.queues.autocommit = true;
		const existing = <ROSQLOptionsArchitecture>(
			((await this.databaseMethods.get<ROSQLOptionsArchitecture>(
				`${this.configuration.metadataPrefix}${tableName}`,
			)) ?? {})
		);
		const lastCommit =
			this.configuration.autocommitIntervalName in existing
				? existing[this.configuration.autocommitIntervalName]
				: undefined;
		const lastTick = lastCommit ? DateTime.fromIsoDate(<string>lastCommit)?.UnixTimestampMillis : now();
		const dueTick = lastTick! + 3_600_000 * this.configuration.autocommitInterval;
		if (!(this.configuration.autocommitIntervalName in existing)) {
			if (this.configuration.allowInitialCommitFromAutoCommitFunction)
				await this.commit(tableName, this.configuration.initialAutocommitAlias);
			else
				await this.databaseMethods.set(
					`${this.configuration.metadataPrefix}${tableName}`,
					Object.assign(existing, {
						[this.configuration.autocommitIntervalName]: DateTime.now().ToIsoDate(),
					}),
				);
		}
		task.wait(math.max(dueTick - now(), 0));
		await this.commit(tableName);
		this.queues.autocommit = false;
	}

	private enableListeners(): void {
		this.listeners.coroutine.Connect(async (name) => {
			await this.open(name);
		});
	}

	private readAndActionConfig(): void {
		if (this.configuration.allowAutoDataManagement && this.configuration.allowAutoDataServerShutdownBackup) {
			game.BindToClose(async () => {
				const promises: Promise<unknown>[] = [];
				for (const player of Players.GetPlayers())
					if (this.playerTable.has(player))
						promises.push(
							this.savePlayerData(player).catch((err) => {
								warn(`Failed to save data for player ${player.Name} on server shutdown: ${err}`);
							}),
						);
				await Promise.all(promises);
			});
		}
	}
}
