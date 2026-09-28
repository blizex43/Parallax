import { Controller, OnStart } from "@flamework/core";
import { throttle } from "@rbxts/set-timeout";
import { OnSignalSubscribed } from "shared/decorators";
import { BlockDebounce } from "shared/enums/block-enum";
import { AnimationController } from "./animation";
import { CombatState, MiscState, StateEvents } from "shared/enums/config-enum";
import type { CharacterController } from "./character";
import { Events } from "client/network";
import { Serializers } from "shared/network";
import type { JournalController } from "./journal";
import { JournalHandler } from "shared/classes/journal-handler";

@Controller()
export class BlockController extends JournalHandler implements OnStart {
	// public charm!: StateType<boolean>;
	private blockThrottled = throttle(() => true, BlockDebounce, {});
	constructor(
		private readonly character: CharacterController,
		private readonly animation: AnimationController,
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
			this.onBlockReleased();
			return;
		}
		const character = this.character.get();
		if (this.blockThrottled.pending() || !character || this.isBlacklisted()) return;
		this.journalUtil.write(CombatState.Block, true);
		this.animation.playAnim(character, "block", false);
		Events.game.block.fire(Serializers.block.serialize({ on: true }));
	}
	public onBlockReleased() {
		const character = this.character.get();
		if (this.journalUtil.read<boolean>(CombatState.Block)) this.blockThrottled();
		this.journalUtil.write(CombatState.Block, false);
		if (character) {
			this.animation.stopAnim(character, "block");
			Events.game.block.fire(Serializers.block.serialize({ on: false }));
		}
	}
}
