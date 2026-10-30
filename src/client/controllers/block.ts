import { Controller, OnStart } from "@flamework/core";
import { throttle } from "@rbxts/set-timeout";
import { OnSignalSubscribed } from "shared/decorators";
import { BlockDebounce } from "shared/enums/block-enum";
import { AnimationController } from "./animation";
import { CombatState, MiscState, StateEvents } from "shared/enums/config-enum";
import type { CharacterController } from "./character";
import { Events } from "client/network";
import type { DodgeController } from "client/controllers/dodge";
import { Serializers } from "shared/network";
import type { JournalController } from "./journal";
import { JournalHandler } from "shared/classes/journal-handler";
import { DodgeProperties } from "shared/enums/dodge-enum";

@Controller()
export class BlockController extends JournalHandler implements OnStart {
	// public charm!: StateType<boolean>;
	private blockThrottled = throttle(() => true, BlockDebounce, {});
	private blockStartedAt?: number;
	constructor(
		private readonly character: CharacterController,
		private readonly animation: AnimationController,
		private readonly dodge: DodgeController,
		readonly journal: JournalController,
	) {
		super(journal.util);
	}

	public onStart(): void {
		this.runMethods([
			{
				handleType: "blacklist",
				paths: [
					CombatState.Stunned,
					CombatState.FullStunned,
					CombatState.BlockBroken,
					CombatState.Windup,
					CombatState.Attacking,
					CombatState.Recovery,
				],
				behavior: "Run If Single True",
			},
			{
				handleType: "override",
				paths: [
					CombatState.Stunned,
					CombatState.FullStunned,
					CombatState.BlockBroken,
					CombatState.Windup,
					CombatState.Attacking,
					CombatState.Recovery,
					MiscState.Cutscene,
				],
				behavior: "Run If Single True",
			},
		]);
	}

	protected onOverride(): void {
		this.onBlockReleased();
	}

	@OnSignalSubscribed(StateEvents[CombatState.Block])
	public onBlock(on: boolean) {
		if (!on) {
			this.onBlockReleased(true);
			return;
		}
		const character = this.character.get();
		if (this.blockThrottled.pending() || !character || this.isBlacklisted()) return;
		this.blockStartedAt = os.clock();
		this.journalUtil.write(CombatState.Block, true);
		this.animation.playAnim(character, "block", false);
		Events.game.block.fire(Serializers.block.serialize({ on: true }));
	}
	public onBlockReleased(attemptDodge: boolean = false) {
		const character = this.character.get();
		const wasBlocking = this.journalUtil.read<boolean>(CombatState.Block) === true;
		const heldFor = this.blockStartedAt !== undefined ? os.clock() - this.blockStartedAt : math.huge;
		this.blockStartedAt = undefined;
		if (wasBlocking) this.blockThrottled();
		this.journalUtil.write(CombatState.Block, false);
		if (character) {
			this.animation.stopAnim(character, "block");
			Events.game.block.fire(Serializers.block.serialize({ on: false }));
		}
		if (attemptDodge && wasBlocking && heldFor <= DodgeProperties.quickBlockTap && !this.isBlacklisted())
			this.dodge.attempt();
	}
}
