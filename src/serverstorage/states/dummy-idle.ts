import type { BlackboardStateType } from "shared/structs/websocket";
import AIStateBase from "./host";

// Dummy state for training dummies (takes damage but doesn't react)
export default class DummyState extends AIStateBase {
	public priority: number = 2;

	public OnEnter(bb: BlackboardStateType): void {
		print("AI State: Dummy");
	}

	public Update(dt: number, bb: BlackboardStateType): void {
		// Dummy logic: maybe check health, play animations
	}

	public OnExit(bb: BlackboardStateType): void { }
}
