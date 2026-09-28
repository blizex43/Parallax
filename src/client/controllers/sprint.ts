import type { AnimationController } from "./animation";
import { CombatState, MiscState, MovementState, StateEvents } from "shared/enums/config-enum";
import { OnSignalSubscribed } from "shared/decorators";
import { Controller, OnStart } from "@flamework/core";
import type { LogStart, OnCharacterRemove } from "shared/hooks";
import type { CharacterController } from "./character";
import { throttle } from "@rbxts/set-timeout";
import { SprintDebounce } from "shared/enums/sprint-enum";
import { $print } from "rbxts-transform-debug";
import { Events } from "client/network";
import { Serializers } from "shared/network";
import { JournalHandler } from "shared/classes/journal-handler";
import type { JournalController } from "./journal";
@Controller()
export class SprintController extends JournalHandler implements LogStart, OnStart, OnCharacterRemove {
	// public charm!: StateType<boolean>;
	private readonly sprintThrottled = throttle(() => true, SprintDebounce, {});
	constructor(
		private readonly animationController: AnimationController,
		private readonly character: CharacterController,
		readonly journal: JournalController,
	) {
		super(journal.util);
	}

	public onStart(): void {
		// Transfer
		this.runMethods([
			{
				handleType: "blacklist",
				paths: [
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
				behavior: "Run If Single True",
			},
			{
				handleType: "override",
				paths: [
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
				behavior: "Run If Single True",
			},
		]);
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
		this.journalUtil.write(MovementState.Sprint, true);
		this.animationController.playAnim(character, "sprint");
		Events.game.sprint(Serializers.sprint.serialize({ on: true }));
	}
	public onSprintEnd() {
		const character = this.character.get();
		if (this.journalUtil.read<boolean>(MovementState.Sprint)) this.sprintThrottled();
		this.journalUtil.write(MovementState.Sprint, false);
		if (!character) return;
		this.animationController.stopAnim(character, "sprint");
		Events.game.sprint(Serializers.sprint.serialize({ on: false }));
	}

	protected onOverride(): void {
		this.onSprintEnd();
	}
}
