import { Dependency, OnTick } from "@flamework/core";
import { Component, type Components } from "@flamework/components";
import { $nameof } from "rbxts-transform-debug";
import InstanceExtendable from "shared/base-components/instance";
import { Sigmoid } from "shared/classes/sigmoid";
import { OrbiterInstanceEnum } from "shared/structs/orbit";
import Signal from "@rbxts/signal";
import { noop } from "shared/utility/functions";
type Attributes = typeof OrbiterInstanceEnum;

@Component({
	tag: $nameof<Orbiter>(),
	defaults: OrbiterInstanceEnum,
})
export class Orbiter extends InstanceExtendable<Attributes, Attachment> implements OnTick {
	private readonly sigmoid: Sigmoid = new Sigmoid({ initTransition: 1 });
	private readonly positionChanged: Signal<(pos: Vector3) => void> = new Signal();
	private readonly baseOffset = this.instance.Position;
	public constructor() {
		super();
		this.addToCleanup(this.positionChanged, this.installSigmoidRestartSignal(), this.instance);
	}

	public onTick(dt: number): void {
		if (this.sigmoid.getTransitionAlpha() === 1) return;
		return this.incrementAttachmentOffset(dt);
	}

	public incrementAttachmentOffset(dt: number): void {
		const oldAlpha = this.sigmoid.getTransitionAlpha();
		const alpha = this.sigmoid.setClampedTransitionAlpha(oldAlpha + dt / this.attributes.TransitionTime);
		this.instance.Position = this.sigmoid.playLerp(
			this.attributes.CurrentDirection,
			this.attributes.EndDirection,
			alpha,
		);
		if (alpha >= 1) this.set(this.instance.Position);
	}

	public installSigmoidRestartSignal(): RBXScriptConnection {
		return this.positionChanged.Connect(() =>
			noop(this.sigmoid.setClampedTransitionAlpha(0), this.set(this.instance.Position)),
		);
	}

	public set(current: Vector3) {
		this.attributes.CurrentDirection = current;
	}

	public update(velocity: Vector3) {
		if (!this.instance.Parent || !this.instance.Parent.IsA("BasePart")) return;
		const localVelocity = this.instance.Parent.CFrame.VectorToObjectSpace(velocity);
		const speed = localVelocity.Magnitude;
		if (speed < 0.1) {
			this.attributes.EndDirection = this.baseOffset;
			return;
		}
		const predictionScale = math.min(speed * 0.5, this.attributes.MaxOffset);
		const predictedOffset = this.baseOffset.add(localVelocity.Unit.mul(predictionScale));
		this.attributes.EndDirection = predictedOffset;
		this.positionChanged.Fire(predictedOffset);
	}

	public static create(attachment: Attachment): Orbiter {
		return Dependency<Components>().addComponent(attachment);
	}
}
