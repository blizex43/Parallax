import { BaseComponent } from "@flamework/components";
import { Janitor } from "@rbxts/janitor";

export default class ReusableComponent<A extends {} = {}, I extends Instance = Instance> extends BaseComponent<A, I> {
	protected readonly janitor = new Janitor();

	protected clean(): void {
		if (!("Cleanup" in this.janitor)) return;
		this.janitor.Cleanup();
	}
}
