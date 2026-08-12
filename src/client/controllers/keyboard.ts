import { CharmHandler } from "shared/classes/charm-handler";
import { Cooldown, OnSignalSubscribed } from "shared/decorators";
import { CombatState, StateEvents } from "shared/enums/config-enum";
import type { WebsocketController } from "./state";
import type { OnCharacterAdd } from "shared/hooks";
import type { CharacterController } from "./character";
import { EquipDebounce } from "shared/enums/keyboard-enum";
import { Controller, type OnStart } from "@flamework/core";
import type { StateType } from "shared/structs/websocket";
import type { WebsocketManagementController } from "./websocket-manager";

@Controller()
export class KeyboardController extends CharmHandler<boolean> implements OnStart, OnCharacterAdd {
	public charm!: StateType<boolean>;
	constructor(
		private readonly character: CharacterController,
		protected readonly ws: WebsocketController,
		private readonly wsm: WebsocketManagementController,
	) {
		super((...args) => ws.get(...args), CombatState.CombatEquip);
	}
	onStart(): void {
		this.giveCharmMethods({
			blacklist: {
				call: (...args) => this.ws.getBoardTrayTypeCallback(...args),
				names: [CombatState.Block, CombatState.Ragdoll, CombatState.Exhausted],
			},
			restartCharmOnSignal: {
				charm: <StateType>this.charm,
			},
		});
	}
	@OnSignalSubscribed(StateEvents[CombatState.CombatEquip])
	@Cooldown(EquipDebounce)
	public equip() {
		if (!this.canUse()) return;
		this.wsm.setState(CombatState.CombatEquip, !this.charm.status);
	}

	public canUse(): boolean {
		return !this.isBlacklisted();
	}

	public async onCharacterAdd(): Promise<void> {
		const humanoid = this.character.getHumanoid() ?? (await this.character.mustGetHumanoid());
		humanoid.Died.Once(() => this.__signal.Fire());
	}
}
