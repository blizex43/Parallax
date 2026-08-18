import { Service, type OnInit } from "@flamework/core";
import { DataStoreService as Data, Players } from "@rbxts/services";
import { Firebase } from "@rbxts/firebase";
import Signal from "@rbxts/signal";
import type { LogStart } from "shared/hooks";
import type { OnPlayerJoin, OnPlayerLeave } from "serverstorage/hooks";
import { Events } from "serverstorage/network";
import { Serializers } from "shared/network";
import { LinkRemote } from "serverstorage/decorators";
import { LogBenchmark, OnSignalCounterReached, SpawnTask } from "shared/decorators";
import { roundDecimal } from "shared/utility/numbers";
import {
	type PlayerData,
	type GlobalData,
	type PsuedoPlayerData,
	INITIAL_DATA,
	INITIAL_PSUEDO_DATA,
	type PlayerDataKeys,
} from "shared/data-models/player-data";
import { isNull } from "shared/utility/t-isA";
import Log from "shared/log";
import Object from "@rbxts/object-utils";
import { RoSQL } from "shared/forks/rosql";
import DOTENV from "serverstorage/secret/sql.env";
import { formatToDatabase, formatToGame } from "shared/utility/data";
const FirebaseCreated = new Signal();
export async function getFirebaseInfo(): Promise<[string, string]> {
	return new Promise((resolve, reject) => {
		const env = Data.GetDataStore("EnvironmentInfo");
		try {
			const authKey = env.GetAsync<string>("FIREBASE_AUTH")[0]!;
			const dbUrl = env.GetAsync<string>("FIREBASE_URL")[0]!;
			if (isNull(authKey)) return reject("FIREBASE_AUTH was not found in EnvironmentInfo data store");
			if (isNull(dbUrl)) return reject("FIREBASE_URL was not found in EnvironmentInfo data store");

			resolve([dbUrl, authKey]);
		} catch (err) {
			reject(`Failed to fetch Firebase info because DataStoreService errored: ${err}`);
		}
	});
}

@Service({ loadOrder: -100000 })
export class DataService implements OnInit, OnPlayerJoin, OnPlayerLeave, LogStart {
	public readonly loaded = new Signal<(player: Player, data: PlayerData) => void>();
	public readonly updated = new Signal<(player: Player, data: PlayerData, changed: PlayerDataKeys[]) => void>();
	public readonly outpostUpdate = new Signal<(player: Player, data: PlayerData) => void>();
	public readonly updatedGlobal = new Signal<(data: GlobalData) => void>();
	public readonly snapshots: Record<number, PlayerData> = {};
	public readonly psuedoData: Map<string, PsuedoPlayerData> = new Map();
	private firebase!: Firebase;
	private rosql!: RoSQL;
	private readonly loadingPlayers = new Map<Player, Promise<Maybe<PlayerData>>>();
	private readonly leavingPlayers = new Set<Player>();

	@SpawnTask()
	public async onInit(): Promise<void> {
		this.firebase = new Firebase(...(await getFirebaseInfo()));
		this.rosql = await RoSQL.fromDotEnv(DOTENV, this.firebase, INITIAL_DATA, {
			encryption: formatToDatabase,
			decryption: formatToGame,
		});
		FirebaseCreated.Fire();
	}

	@LinkRemote(Events.data.initialize)
	@LogBenchmark((_, msElapsed, player) => `Initialized ${player}'s data in ${roundDecimal(msElapsed, 2)} ms`)
	@OnSignalCounterReached(FirebaseCreated, 1, true)
	public async setup(player: Player): Promise<void> {
		const data = await this.initialize(player);
		this.loaded.Fire(player, data);
		Events.data.loaded(player, Serializers.playerData.serialize(data));
	}

	public async onPlayerJoin(player: Player): Promise<void> {
		const promise = (async () => {
			if (!this.rosql) FirebaseCreated.Wait();
			try {
				const data = await this.getPlayerData(player, true);
				print("Fetched Data: ", data);
				this.set(player, data!, false);
				return data;
			} catch (err) {
				player.Kick(`Data failed to load, please try rejoining!`);
				return Log.fatal(<string>err);
			}
		})();

		this.loadingPlayers.set(player, promise);
		await promise;
		this.loadingPlayers.delete(player);
	}

	public async query(msg: string): Promise<[boolean, string]> {
		try {
			const response = await this.rosql.query(msg);
			return [true, <string>response];
		} catch (e) {
			return [false, <string>e];
		}
	}

	public async onPlayerLeave(player: Player): Promise<void> {
		if (!this.rosql) {
			warn(`[DATA] Skipping save for ${player.Name} (${player.UserId}) because RoSQL is not initialized.`);
			return;
		}
		if (this.leavingPlayers.has(player)) {
			warn(`[DATA] Duplicate leave save ignored for ${player.Name} (${player.UserId}).`);
			return;
		}

		this.leavingPlayers.add(player);

		try {
			const loadingPromise = this.loadingPlayers.get(player);
			if (loadingPromise) {
				print(`[DATA] ${player.Name} (${player.UserId}) left while data was loading; waiting before save.`);
				try {
					await loadingPromise;
				} catch (err) {
					warn(`[DATA] ${player.Name} (${player.UserId}) load failed before leave save: ${err}`);
				}
			}

			const data = this.rosql.getPlayerData<PlayerData>(player);
			if (!data) {
				warn(`[DATA] Skipping save for ${player.Name} (${player.UserId}) because data was never registered.`);
				return;
			}

			print(`[DATA] Saving ${player.Name} (${player.UserId}) on leave.`);
			await this.rosql.deregisterPlayer(player, true).catch((err) => {
				throw err;
			});
			print(`[DATA] Saved ${player.Name} (${player.UserId}) on leave.`);
		} catch (err) {
			warn(`[DATA] Failed to save ${player.Name} (${player.UserId}) on leave: ${err}`);
		} finally {
			this.delSnapshot(player);
			this.leavingPlayers.delete(player);
		}
	}

	private async saveLeavingPlayersOnShutdown(): Promise<void> {
		const promises: Promise<void>[] = [];
		for (const player of Players.GetPlayers()) {
			if (!this.rosql.getPlayerData<PlayerData>(player)) continue;
			promises.push(
				(async () => {
					const loadingPromise = this.loadingPlayers.get(player);
					if (loadingPromise) {
						print(
							`[DATA] BindToClose waiting for ${player.Name} (${player.UserId}) to finish loading before shutdown save.`,
						);
						await loadingPromise.catch((err) => {
							warn(
								`[DATA] ${player.Name} (${player.UserId}) failed loading during shutdown save: ${err}`,
							);
						});
					}

					if (!this.rosql.getPlayerData<PlayerData>(player)) {
						warn(
							`[DATA] BindToClose cannot save ${player.Name} (${player.UserId}) because data is not registered.`,
						);
						return;
					}

					print(`[DATA] BindToClose saving player ${player.Name} (${player.UserId}).`);
					await this.rosql.savePlayerData(player);
					print(`[DATA] BindToClose saved player ${player.Name} (${player.UserId}).`);
				})().catch((err) => {
					warn(`[DATA] BindToClose failed to save player ${player.Name} (${player.UserId}): ${err}`);
				}),
			);
		}

		if (promises.size() > 0) print(`[DATA] BindToClose waiting for ${promises.size()} player save(s).`);
		await Promise.all(promises);
	}

	public async getGlobal<T>(directory: string, defaultValue?: T): Promise<Maybe<T>> {
		return this.firebase.get<T>(directory, defaultValue!);
	}

	public async setGlobal<T>(directory: string, value: T): Promise<void> {
		await this.firebase.set<T>(directory, value);
		this.updatedGlobal.Fire((await this.getGlobal(""))!);
	}

	public async addToArrayGlobal<T extends defined>(directory: string, value: T): Promise<void> {
		await this.firebase.addToArray(directory, value);
		this.updatedGlobal.Fire((await this.getGlobal(""))!);
	}

	public async initialize(player: Player): Promise<PlayerData> {
		const data = (await this.getPlayerData<PlayerData>(player, true))!;
		for (const [key, value] of pairs(INITIAL_DATA)) if (!(key in data)) data[<never>key] = <never>value;
		return this.set(player, data);
	}

	public getPsuedo(guid: string, initialValue = INITIAL_PSUEDO_DATA): PsuedoPlayerData {
		return this.psuedoData.get(guid) ?? this.setPsuedo(guid, initialValue);
	}

	public setPsuedo(guid: string, value: PsuedoPlayerData): PsuedoPlayerData {
		return this.psuedoData.set(guid, value) && value;
	}

	public get(player: Player): PlayerData {
		const data = this.rosql.getPlayerData<PlayerData>(player);
		if (!data) throw Log.fatal(`Data not loaded for ${player.Name}`);
		return data;
	}

	public async forceGet(player: Player): Promise<PlayerData> {
		const promise = this.loadingPlayers.get(player);
		if (promise) return (await promise)!;
		if (this.rosql.getPlayerData<PlayerData>(player)) return this.get(player);

		return new Promise((resolve, reject) => {
			const timeout = task.delay(10, () => {
				reject(`forceGet timed out for ${player.Name} — data never loaded`);
			});

			const conn = this.loaded.Connect((loadedPlayer, data) => {
				if (loadedPlayer !== player) return;
				task.cancel(timeout);
				conn.Disconnect();
				resolve(data);
			});
		});
	}

	public set(player: Player, data: PlayerData, outpostUpdate: boolean = true): PlayerData {
		const snapshot = this.getSnapshot(player);
		this.update(player, data, this.getChangedValue(data, snapshot ?? data), outpostUpdate);
		this.saveSnapshot(player, data);
		return data;
	}

	public saveSnapshot(player: Player, data: PlayerData): void {
		this.snapshots[player.UserId] = Object.copy(data);
	}

	public getSnapshot(player: Player): Maybe<PlayerData> {
		return player.UserId in this.snapshots ? this.snapshots[player.UserId] : undefined;
	}

	public delSnapshot(player: Player): void {
		delete this.snapshots[player.UserId];
	}

	public wipe(player: Player): PlayerData {
		const changed = this.getChangedValue(INITIAL_DATA, this.get(player));
		this.update(player, INITIAL_DATA, changed);
		return INITIAL_DATA;
	}

	private async getPlayerData<T extends PlayerData>(player: Player, force?: boolean): Promise<Maybe<T>> {
		const [data, success, response] = await this.rosql.registerPlayer<PlayerData>(player, force);
		if (!success) throw error(response);
		return <T>data;
	}

	private getChangedValue(changed: PlayerData, old: PlayerData): PlayerDataKeys[] {
		if (!old) return [];
		const changedIndexes: PlayerDataKeys[] = [];
		for (const [index, value] of pairs(changed))
			if (!(index in old) || old[index] !== value) changedIndexes.push(index);
		return changedIndexes;
	}

	@SpawnTask()
	private update(player: Player, data: PlayerData, changed: PlayerDataKeys[], outpostUpdate: boolean = true): void {
		this.updated.Fire(player, data, changed);
		if (outpostUpdate) this.outpostUpdate.Fire(player, data);
		Events.data.updated(player, Serializers.playerData.serialize(data));
	}
}
