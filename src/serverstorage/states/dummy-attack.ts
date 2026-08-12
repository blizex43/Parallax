import { BlackboardStateType } from "shared/structs/websocket";
import AIStateBase from "./host";

// Aggressive attacking state
export default class DummyAttackState extends AIStateBase {
	public priority: number = 4;
	public OnEnter(bb: BlackboardStateType): void {
		print("AI State: DummyAttack");
	}

	public async Update(dt: number, bb: BlackboardStateType): Promise<void> {
		await this.header.onServerAttackInvoked(this.character, "Light").finally();
	}

	public OnExit(bb: BlackboardStateType): void {
		// Cleanup if needed
	}
}
