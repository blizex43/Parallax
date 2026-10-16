import { OnInit, Service } from "@flamework/core";
import CharmSync from "@rbxts/charm-sync";
import { Events } from "serverstorage/network";
import { WebsocketUtilities } from "shared/classes/websocket-utilities";
import { createFlameworkCharms } from "shared/constants";
import { OnSignalSubscribed, SpawnTask } from "shared/decorators";
import type { LogStart } from "shared/hooks";
import { Players } from "@rbxts/services";
import type { AtomType } from "shared/structs/atom";
import Signal from "@rbxts/signal";

@Service()
export class WebsocketService implements OnInit, LogStart {
	public readonly wsCreated: Signal<(plaracter: Plaracter, mgr: WebsocketUtilities) => void> = new Signal();
	public readonly wsDestroying: Signal<(plaracter: Plaracter, mgr: WebsocketUtilities) => void> = new Signal();
	private readonly playerStates: Map<
		Player,
		{ WebsocketUtilities: WebsocketUtilities; syncer: ReturnType<typeof CharmSync.server>; cleanup: Callback }
	> = new Map();
	private readonly npcStates: Map<CharacterModel, WebsocketUtilities> = new Map();

	@SpawnTask()
	async onInit(): Promise<void> {
		this.connectHydrateEvent();
	}

	public addNPC(character: CharacterModel): WebsocketUtilities {
		const webUtil = new WebsocketUtilities(createFlameworkCharms());
		this.npcStates.set(character, webUtil);
		this.wsCreated.Fire(character, webUtil);
		return webUtil;
	}

	public removeNPC(character: CharacterModel): void {
		const state = this.npcStates.get(character);
		if (state) {
			this.wsDestroying.Fire(character, state);
			state.destroyAllStateTypes();
			this.npcStates.delete(character);
		}
	}


	@OnSignalSubscribed(Players.PlayerAdded)
	public addPlayer(player: Player): void {
		const charms = createFlameworkCharms();
		const webUtil = new WebsocketUtilities(charms);
		const syncer = CharmSync.server({ atoms: charms });
		const cleanup = syncer.connect((firedPlayer, payload): void => {
			if (player !== firedPlayer) return;
			Events.state.updated(firedPlayer, payload);
		});
		this.playerStates.set(player, { WebsocketUtilities: webUtil, syncer, cleanup });
		this.wsCreated.Fire(player, webUtil);
	}

	@OnSignalSubscribed(Players.PlayerRemoving)
	public removePlayer(player: Player): void {
		const state = this.playerStates.get(player);
		if (state) {
			this.wsDestroying.Fire(player, state.WebsocketUtilities);
			state.cleanup();
			state.WebsocketUtilities.destroyAllStateTypes();
			this.playerStates.delete(player);
		}
	}

	public getPlayerWebsocketUtilities(player: Player): Maybe<WebsocketUtilities> {
		return this.playerStates.get(player)?.WebsocketUtilities;
	}

	public getWebsocketUtilities(character: CharacterModel): Maybe<WebsocketUtilities> {
		const player = Players.GetPlayerFromCharacter(character);
		if (player) return this.getPlayerWebsocketUtilities(player);
		else return this.npcStates.get(character);
	}

	public setPlayerState<T extends AtomType>(
		player: Player,
		key: keyof ReturnType<typeof createFlameworkCharms>,
		value: T,
	) {
		const WebsocketUtilities = this.getPlayerWebsocketUtilities(player);
		if (WebsocketUtilities) WebsocketUtilities.set(key, value);
	}

	private connectHydrateEvent() {
		Events.state.hydrate.connect((player) => {
			const state = this.playerStates.get(player);
			if (state) {
				state.syncer.hydrate(player);
			}
		});
	}
}
