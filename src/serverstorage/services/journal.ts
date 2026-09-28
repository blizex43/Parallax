import { Service } from "@flamework/core";
import { ActionJournal, JournalMode, StateManager } from "@rbxts/action-journal";
import { AegisServer as Aegis } from "@rbxts/aegis";
import { deepCopy } from "@rbxts/object-utils";
import Signal from "@rbxts/signal";
import type { OnNPCDestroyed, OnNPCMade, OnPlayerJoin, OnPlayerLeave } from "serverstorage/hooks";
import { JournalUtil } from "shared/classes/journal-util";
import { AegisPorts } from "shared/enums/aegis-enum";
import { GameStateCopy } from "shared/enums/journal-enum";
import type { JournalAegisSync } from "shared/structs/aegis";
import type { EntityStateCache, GameState, JournalSignalType } from "shared/structs/journal";
import type { NPCType } from "shared/structs/npc";
import { noop } from "shared/utility/functions";
import { isPlayer } from "shared/utility/t-isA";
import { Players } from "@rbxts/services";
@Service()
export class JournalService implements OnPlayerJoin, OnPlayerLeave, OnNPCMade, OnNPCDestroyed {
	public readonly journalCreated: Signal<(plaracter: Plaracter, cache: EntityStateCache) => void> = new Signal();
	public readonly journalDestroying: Signal<(plaracter: Plaracter, cache: EntityStateCache) => void> = new Signal();
	private readonly playerCache: Map<Player, EntityStateCache> = new Map();
	private readonly entityCache: Map<CharacterModel, EntityStateCache> = new Map();
	private readonly journalAegis = new Aegis<JournalAegisSync>();

	public async onPlayerJoin(player: Player): Promise<void> {
		const state = new StateManager(deepCopy(GameStateCopy));
		const actions = new ActionJournal(state, { mode: JournalMode.Record });
		const connections: RBXScriptConnection[] = [];
		connections.push(
			actions.added.Connect((action) =>
				this.journalAegis.dispatch(AegisPorts.JournalSync, player, { action, status: 200 }),
			),
		);
		const cache: EntityStateCache = {
			util: new JournalUtil(state),
			state,
			actions,
			connections,
		};
		this.playerCache.set(player, cache);
		this.journalCreated.Fire(player, cache);
	}

	public async onPlayerLeave(player: Player): Promise<void> {
		const cache = this.fetchCache(player);
		if (!cache) return;
		this.journalDestroying.Fire(player, cache);
		this.fetchCache(player, true);
		for (const connection of cache.connections) if (connection.Connected) connection.Disconnect();
	}

	public async onNPCMade(npc: NPCType): Promise<void> {
		const state = new StateManager(deepCopy(GameStateCopy));
		const actions = new ActionJournal(state, { mode: JournalMode.Record });
		const connections: RBXScriptConnection[] = [];
		const cache: EntityStateCache = {
			util: new JournalUtil(state),
			state,
			actions,
			connections,
		};
		this.entityCache.set(npc.model, cache);
		this.journalCreated.Fire(npc.model, cache);
	}

	public async onNPCDestroyed(npc: NPCType): Promise<void> {
		const cache = this.fetchCache(npc.model);
		if (!cache) return;
		this.journalDestroying.Fire(npc.model, cache);
		this.fetchCache(npc.model, true);
		for (const connection of cache.connections) if (connection.Connected) connection.Disconnect();
	}

	public writeStateValue(index: Player | CharacterModel, path: string, value: unknown, author?: string): void {
		const util = this.fetchUtil(index);
		if (!util) return;
		util.write(path, <never>value, author);
	}

	public writeStateValueEntry(index: Player | CharacterModel, path: string, value: unknown, author?: string): void {
		const util = this.fetchUtil(index);
		if (!util) return;
		util.writeEntry(path, <never>value, author);
	}

	public writeStateValueRecord(
		index: Player | CharacterModel,
		path: string,
		key: string,
		value: unknown,
		author?: string,
	): void {
		const util = this.fetchUtil(index);
		if (!util) return;
		util.writeRecord(path, key, <never>value, author);
	}

	public writeStateValueRecordFor(
		index: Player | CharacterModel,
		path: string,
		key: string,
		value: unknown,
		duration: number,
		author?: string,
	): Promise<void> | undefined {
		const util = this.fetchUtil(index);
		if (!util) return;
		return util.writeRecordFor(path, key, <never>value, duration, author);
	}

	public fetchStateValue<T>(index: Player | CharacterModel, key: string): Maybe<T> {
		const util = this.fetchUtil(index);
		if (!util) return;
		return util.read(key);
	}

	public fetchUtil(index: Player | CharacterModel): Maybe<JournalUtil<StateManager<GameState>>> {
		const cache = this.fetchCache(index);
		if (!cache) return;
		return cache.util;
	}

	public fetchState(index: Player | CharacterModel): Maybe<StateManager<GameState>> {
		const cache = this.fetchCache(index);
		if (!cache) return;
		return cache.state;
	}

	public fetchStateChanged<T>(
		index: Player | CharacterModel,
		key: string,
	): Maybe<Signal<(info: Omit<JournalSignalType<T>, "path">) => void>> {
		const util = this.fetchUtil(index);
		if (!util) return;
		return util.getPathChanged<T>(key);
	}

	public fetchCache(index: Player | CharacterModel, pop: boolean = false): Maybe<EntityStateCache> {
		const player = isPlayer(index) ? index : Players.GetPlayerFromCharacter(index);
		const cache = player ? this.playerCache.get(player) : this.entityCache.get(index as CharacterModel);
		if (cache && pop)
			noop(player ? this.playerCache.delete(player) : this.entityCache.delete(index as CharacterModel));
		return cache;
	}
}
