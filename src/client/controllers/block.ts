import { Controller, OnStart } from "@flamework/core";
import { throttle } from "@rbxts/set-timeout";
import { OnSignalSubscribed } from "shared/decorators";
import { BlockDebounce } from "shared/enums/block-enum";
import type { WebsocketController } from "./state";
import { AnimationController } from "./animation";
import type { StateType } from "shared/structs/websocket";
import { CombatState, MiscState, StateEvents } from "shared/enums/config-enum";
import type { CharacterController } from "./character";
import { CharmHandler } from "shared/classes/charm-handler";
import type { WebsocketManagementController } from "./websocket-manager";
import { Events } from "client/network";
import { Serializers } from "shared/network";

@Controller()
export class BlockController extends CharmHandler<boolean> implements OnStart {
	public charm!: StateType<boolean>;
	private blockThrottled = throttle(() => true, BlockDebounce, {});
	constructor(
		private readonly character: CharacterController,
		private readonly animation: AnimationController,
		private readonly ws: WebsocketController,
		private readonly wsm: WebsocketManagementController,
	) {
		super((...args) => ws.get(...args), CombatState.Block);
	}

	public onStart(): void {
		this.giveCharmMethods({
			blacklist: {
				call: (...args) => this.ws.getBoardTrayTypeCallback(...args),
				names: [
					CombatState.Stunned,
					CombatState.FullStunned,
					CombatState.BlockBroken,
					CombatState.Windup,
					CombatState.Attacking,
					CombatState.Recovery,
				],
			},
			override: {
				call: (...args) => this.ws.getGroupSubscribedSignal(...args),
				names: [
					CombatState.Stunned,
					CombatState.FullStunned,
					CombatState.BlockBroken,
					CombatState.Windup,
					CombatState.Attacking,
					CombatState.Recovery,
					MiscState.Cutscene,
				],
				type: true,
			},
		});
	}

	protected onOverride(): void {
		this.onBlockReleased();
	}

	@OnSignalSubscribed(StateEvents[CombatState.Block])
	onBlock(on: boolean) {
		if (!on) {
			this.onBlockReleased();
			return;
		}
		const character = this.character.get();
		if (this.blockThrottled.pending() || !character || this.isBlacklisted()) return;
		this.wsm.setState(CombatState.Block, true);
		this.animation.playAnim(character, "block", false);
		Events.game.block.fire(Serializers.block.serialize({ on: true }));
	}
	onBlockReleased() {
		const character = this.character.get();
		if (this.charm.status) this.blockThrottled();
		this.wsm.setState(CombatState.Block, false);
		if (character) {
			this.animation.stopAnim(character, "block");
			Events.game.block.fire(Serializers.block.serialize({ on: false }));
		}
	}
}
