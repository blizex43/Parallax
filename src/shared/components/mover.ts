import { Dependency, type OnStart } from "@flamework/core";
import { Component, type Components } from "@flamework/components";
import { $nameof } from "rbxts-transform-debug";
import { Create, Reconcile } from "shared/utility/instance";
import InstanceExtendable from "shared/base-components/instance";
import type { PushPacket } from "shared/structs/packets";
import type { PushDirection } from "shared/structs/push";
import { DefaultDashProperties, PushInstanceEnum } from "shared/enums/push-enum";
import { LogStart } from "shared/hooks";
import Object from "@rbxts/object-utils";
import { toWorldVector } from "shared/utility/vector";

type Attributes = Required<PushPacket> & typeof PushInstanceEnum;

@Component({
	tag: $nameof<Mover>(),
	defaults: Object.assign({}, PushInstanceEnum, DefaultDashProperties),
})
export class Mover extends InstanceExtendable<Attributes, LinearVelocity> implements OnStart, LogStart {
	private promise: Maybe<Promise<void>>;
	public constructor() {
		super();
	}

	public async onStart(): Promise<void> {
		Reconcile(this.instance, PushInstanceEnum);
		const root = (<CharacterModel>this.instance.Parent?.Parent).HumanoidRootPart;
		this.createAndBindAttachment(root);
	}
	public set(defaults: Partial<Attributes>) {
		return Reconcile(this.attributes, defaults);
	}

	public playExtern(useVector: boolean = false): void {
		if (this.running()) this.cancel();
		this.promise = this.playIntern(useVector);
	}

	private createAndBindAttachment(root: RootPart): void {
		const attachment = Create("Attachment", "MoverAttachment", root);
		this.instance.Attachment0 = attachment;
	}

	private async playIntern(useVector: boolean = false): Promise<void> {
		const direction = (useVector ? this.attributes.vector : this.getVectorByType(this.attributes.direction)).mul(
			this.attributes.power,
		);
		if (this.attributes.unturnable) {
			this.instance.RelativeTo = Enum.ActuatorRelativeTo.World;
			this.instance.VectorVelocity = toWorldVector((<RootPart>this.instance.Parent).CFrame, direction);
		} else {
			this.instance.RelativeTo = Enum.ActuatorRelativeTo.Attachment0;
			this.instance.VectorVelocity = direction;
		}
		this.instance.Enabled = true;
		task.wait(this.attributes.duration);
		this.instance.Enabled = false;
	}

	private running(): Maybe<boolean> {
		return this.promise && this.promise.getStatus() === "Started";
	}

	private cancel(): void {
		this.promise!.cancel();
	}

	private getVectorByType(direction: PushDirection): Vector3 {
		switch (direction) {
			case "Right":
				return new Vector3(1, 0, 0);
			case "Left":
				return new Vector3(-1, 0, 0);
			case "Back":
				return new Vector3(0, 0, 1);
			case "Front":
				return new Vector3(0, 0, -1);
			case "Up":
				return new Vector3(0, 1, 0);
			default:
				return new Vector3(0, -1, 0);
		}
	}

	public static create(character: CharacterModel): Mover {
		const components = Dependency<Components>();
		const mover = Create("LinearVelocity", $nameof<Mover>(), character.HumanoidRootPart);
		return components.addComponent(mover);
	}
}
