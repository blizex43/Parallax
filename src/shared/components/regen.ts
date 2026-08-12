import { Dependency, OnTick, type OnStart } from "@flamework/core";
import { Component, Components } from "@flamework/components";
import { $nameof } from "rbxts-transform-debug";
import { RegenInstanceEnum, RegenPropertiesEnum } from "shared/enums/regen-enum";
import Object from "@rbxts/object-utils";
import { Create, Reconcile } from "shared/utility/instance";
import InstanceExtendable from "shared/base-components/instance";
import { isNegative } from "shared/utility/numbers";
type Attributes = typeof RegenInstanceEnum & typeof RegenPropertiesEnum;
const { clamp, max } = math;
@Component({ tag: $nameof<Regen>(), defaults: Object.assign({}, RegenInstanceEnum, RegenPropertiesEnum) })
export class Regen extends InstanceExtendable<Attributes, NumberValue> implements OnStart, OnTick {
	public readonly lastTicked: number = 0;
	public async onStart(): Promise<void> {
		Reconcile(this.instance, RegenInstanceEnum);
		this.addToCleanup(this.instance);
	}

	public onTick(this: Writable<Regen>): void {
		if (
			this.attributes.disabled ||
			this.attributes.disableRegen ||
			os.clock() - this.lastTicked < this.attributes.regenRate ||
			(this.instance.Value >= this.attributes.max && !isNegative(this.attributes.regenAmount))
		)
			return;
		this.increment();
		this.lastTicked = os.clock();
	}

	public giveValues(obj: Partial<Attributes>, init: boolean = false): void {
		Reconcile(this.attributes, obj);
		if (init) this.set(this.attributes.max);
	}

	public set(n: number) {
		if (this.attributes.disabled) return;
		this.instance.Value = max(n, this.attributes.min);
	}

	public get(): number {
		return this.instance.Value;
	}

	public getMax(): number {
		return this.attributes.max;
	}

	public release(): void {
		this.disable();
		return this.onDestroy();
	}

	public disable(): void {
		this.attributes.disabled = true;
	}

	public disableRegen(): void {
		this.attributes.disableRegen = true;
	}

	public enableRegen(): void {
		this.attributes.disableRegen = false;
	}

	public enable(): void {
		this.attributes.disabled = false;
	}

	public static create(): Regen {
		const components = Dependency<Components>();
		const regenInstance = Create("NumberValue", $nameof<Regen>());
		return components.addComponent(regenInstance);
	}

	public increment(n: number = this.attributes.regenAmount): void {
		const newValue = this.instance.Value + n;
		this.set(clamp(newValue, this.attributes.min, this.attributes.max));
	}
}
