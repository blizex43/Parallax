import type { BlackboardStateType } from "shared/structs/websocket";
import { CombatState } from "shared/enums/config-enum";
import AIStateBase from "./host";
import { isNull } from "shared/utility/t-isA";
import { now } from "shared/utility/time";

// Defensive blocking state - continuous blocking
export default class DummyBlockState extends AIStateBase {
	public priority: number = 5;
	public blockDebounce: number = 0.1;
	public init: boolean = false;
	OnEnter(bb: BlackboardStateType): void {
		super.OnEnter(bb);
		print("AI State: Blocking");
	}

	Update(dt: number, bb: BlackboardStateType): void {
		if (!this.init) return void (this.init = true);
		super.Update(dt, bb);
		const block = this.journal.fetchStateValue<boolean>(this.character, CombatState.Block);
		const blockBroken = this.journal.fetchStateValue<boolean>(this.character, CombatState.BlockBroken);
		if (isNull(block)) return;
		if (block && blockBroken) {
			this.onBlockBroken(bb);
		}

		// If block was broken by an attack, wait briefly and restart blocking
		if (
			!blockBroken &&
			!block &&
			((now() - (this.journal.fetchUtil(this.character)?.getLastWritten(CombatState.Block) ?? now())) / 1000) >
			this.blockDebounce
		) {
			this.startBlocking(bb);
		}
	}

	// Called when block is successfully broken by an attack

	public onBlockBroken(bb: BlackboardStateType): void {
		this.block.handleBlock(this.character, false);
	}

	private startBlocking(bb: BlackboardStateType): void {
		this.block.handleBlock(this.character, true);
	}
}

