import type { AnimationController } from "./animation";
import type { WebsocketController } from "./state";
import { CombatState, MiscState, MovementState, StateEvents } from "shared/enums/config-enum";
import { OnSignalSubscribed } from "shared/decorators";
import { Controller, OnStart } from "@flamework/core";
import type { LogStart, OnCharacterRemove } from "shared/hooks";
import type { CharacterController } from "./character";
import { throttle } from "@rbxts/set-timeout";
import { SprintDebounce } from "shared/enums/sprint-enum";
import { $print } from "rbxts-transform-debug";
import { CharmHandler } from "shared/classes/charm-handler";
import type { StateType } from "shared/structs/websocket";
import type { WebsocketManagementController } from "./websocket-manager";
import { Events } from "client/network";
import { Serializers } from "shared/network";
@Controller()
export class SprintController extends CharmHandler<boolean> implements LogStart, OnStart, OnCharacterRemove {
	public charm!: StateType<boolean>;
	private readonly sprintThrottled = throttle(() => true, SprintDebounce, {});
	constructor(
		private readonly animationController: AnimationController,
		private readonly character: CharacterController,
		private readonly ws: WebsocketController,
		private readonly wsm: WebsocketManagementController,
	) {
		super((...args) => ws.get(...args), MovementState.Sprint);
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
					CombatState.Windup,
					CombatState.Recovery,
					CombatState.Attacking,
					CombatState.Ragdoll,
					CombatState.Knocked,
					CombatState.Exhausted,
					MovementState.NoMove,
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
					MovementState.Dash,
					CombatState.Windup,
					CombatState.Recovery,
					CombatState.Attacking,
					CombatState.Ragdoll,
					CombatState.Knocked,
					CombatState.Exhausted,
					MovementState.NoMove,
					MiscState.Cutscene,
				],
				type: true,
			},
		});
	}

	

	public onCharacterRemove(): void {
		this.onSprintEnd();
	}

	@OnSignalSubscribed(StateEvents[MovementState.Sprint])
	public onSprint(on: boolean) {
		if (!on) {
			this.onSprintEnd();
			return;
		}
		const character = this.character.get();
		if (!character || this.sprintThrottled.pending() || this.isBlacklisted()) {
			$print("Sprint Throttled!", this.isBlacklisted());
			return;
		}
		this.wsm.setState(MovementState.Sprint, true);
		this.animationController.playAnim(character, "sprint");
		Events.game.sprint(Serializers.sprint.serialize({ on: true }));
	}
	public onSprintEnd() {
		const character = this.character.get();
		if (this.charm.status) this.sprintThrottled();
		this.wsm.setState(MovementState.Sprint, false);
		if (!character) return;
		this.animationController.stopAnim(character, "sprint");
		Events.game.sprint(Serializers.sprint.serialize({ on: false }));
	}

	protected onOverride(): void {
		this.onSprintEnd();
	}
}
