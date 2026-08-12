import { Reconcile } from "shared/utility/instance";
import DestroyableComponent from "./destroyable";

export default abstract class InstanceExtendable<
	A extends {} = {},
	I extends Instance = Instance,
> extends DestroyableComponent<A, I> {
	protected addToCleanup(...args: object[]): void {
		for (const obj of args) this.janitor.Add(obj);
	}
	public onStart(noOverwrite: boolean = true): void {
		Reconcile(this.instance, this.attributes, noOverwrite);
	}

	public onDestroy(): void {
		super.destroy();
	}
}
