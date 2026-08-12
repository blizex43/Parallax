import { Controller, OnStart } from "@flamework/core";
import { OnSignalSubscribed } from "shared/decorators";
import { CombatState, MiscState, StateEvents } from "shared/enums/config-enum";
import { CharmHandler } from "shared/classes/charm-handler";
import type { WebsocketController } from "./state";
import type { CFrameController } from "./cframe";
import type { LogStart } from "shared/hooks";
import { Events } from "client/network";
import type { AttackPacket } from "shared/structs/packets";
import { Serializers } from "shared/network";
import { Meta } from "shared/meta";
import type { KeyboardController } from "./keyboard";
import type { StateType } from "shared/structs/websocket";
import type { WebsocketManagementController } from "./websocket-manager";
@Controller()
export class MeleeController extends CharmHandler<boolean> implements OnStart, LogStart {
	public charm!: StateType<boolean>;
	constructor(
		private readonly ws: WebsocketController,
		private readonly cframe: CFrameController,
		private readonly keyboard: KeyboardController,
		private readonly wsm: WebsocketManagementController,
	) {
		super((...args) => ws.get(...args), CombatState.AttackExecutable);
	}

	protected onOverride(on: boolean): void {
		this.wsm.setState(CombatState.AttackExecutable, !on);
	}

	public onStart(): void {
		this.giveCharmMethods({
			blacklist: {
				call: (...args) => this.ws.getBoardTrayTypeCallback(...args),
				names: [
					CombatState.Stunned,
					CombatState.FullStunned,
					CombatState.BlockBroken,
					CombatState.Block,
					CombatState.Ragdoll,
					CombatState.Exhausted,
					MiscState.Cutscene,
				],
			},
			override: {
				call: (...args) => this.ws.getGroupSubscribedSignal(...args),
				names: [
					CombatState.Stunned,
					CombatState.FullStunned,
					CombatState.BlockBroken,
					CombatState.Block,
					CombatState.Ragdoll,
					CombatState.Exhausted,
					MiscState.Cutscene,
				],
				type: true,
			},
			overrideEnd: {
				call: (...args) => this.ws.getGroupSubscribedSignal(...args),
				names: [
					CombatState.Stunned,
					CombatState.FullStunned,
					CombatState.BlockBroken,
					CombatState.Block,
					CombatState.Ragdoll,
					CombatState.Exhausted,
					MiscState.Cutscene,
				],
				type: false,
				runType: "All",
			},
		});
	}
	@OnSignalSubscribed(StateEvents[CombatState.MouseOne])
	public onLight(on: boolean) {
		if (!this.canUse("Light", on)) return;
		this.sendAttack(<AttackPacket>{ name: "Light" });
	}

	@OnSignalSubscribed(StateEvents[CombatState.MouseTwo])
	public onHeavy(on: boolean) {
		if (!this.canUse("Heavy", on)) return;
		this.sendAttack(<AttackPacket>{ name: "Heavy" });
	}

	private sendAttack(params: AttackPacket) {
		Events.game.attack(Serializers.attack.serialize(Meta.fill(params)));
	}

	private canUse(typeMelee: "Light" | "Heavy", on: boolean): boolean {
		const baseBools = !this.isBlacklisted() && this.charm.status && this.keyboard.charm.status && on;
		const typeBool = typeMelee === "Light" ? true : this.cframe.charm.status;
		return baseBools && typeBool;
	}
}
