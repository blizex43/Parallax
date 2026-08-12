import { Component, Components } from "@flamework/components";
import { Dependency, OnRender, type OnStart } from "@flamework/core";
import { ContentProvider } from "@rbxts/services";
import Signal from "@rbxts/signal";
import { $nameof } from "rbxts-transform-debug";
import InstanceExtendable from "shared/base-components/instance";
import { Sigmoid } from "shared/classes/sigmoid";
import { OnKeyframeStepped } from "shared/constants";
import { advmath } from "shared/utility/math";
import { promisifyEvent } from "shared/utility/promises";
import { now } from "shared/utility/time";

@Component({
	tag: $nameof<TrackComponent>(),
})
export class TrackComponent extends InstanceExtendable<object, AnimationTrack> implements OnStart, OnRender {
	public readonly speed: number = this.instance.Speed;
	public readonly weight: number = this.instance.WeightCurrent;
	public readonly priority: Enum.AnimationPriority = this.instance.Priority;
	public readonly looping: boolean = this.instance.Looped;
	public readonly sigmoidEnabled: boolean = true;
	public readonly fade: number = 0;
	public readonly ended: Signal = new Signal();
	public readonly lastStopped: number = 0;
	public readonly startedSignal: Signal = new Signal();
	public readonly transitionTime: number = 0.4;
	private readonly sigmoid: Sigmoid = new Sigmoid({ initTransition: 0 });
	public override async onStart(): Promise<void> {
		this.modifyPriority();
		this.modifyLoop();
		this.onEnded();
		this.addToCleanup(
			this.instance,
			this.startedSignal.Connect(() => this.sigmoid.setClampedTransitionAlpha(0)),
			() => {
				if (this.playing()) this.stop();
			},
			this.instance.KeyframeReached.Connect((name) => {
				OnKeyframeStepped.Fire(this, name);
			}),
		);
		await this.initialize();
	}

	public async initialize(): Promise<void> {
		if (this.playing()) await promisifyEvent(this.ended);
		ContentProvider.PreloadAsync([this.instance]);
		this.instance.Play(0, 0, 0);
		this.stop();
		task.wait(this.fade);
	}

	public onRender(dt: number): void {
		if (!this.sigmoidEnabled) return;
		if (this.playing() && advmath.round(this.instance.WeightCurrent, 3) !== advmath.round(this.weight, 3)) {
			const alpha = this.sigmoid.getTransitionAlpha();
			this.adjustSigmoid(alpha + dt / this.transitionTime);
			this.adjustWeight(this.sigmoid.playLerp(this.instance.WeightCurrent, this.weight, alpha));
		} else if (!this.playing() && this.instance.WeightCurrent >= 0.05) {
			const alpha = this.sigmoid.getTransitionAlpha();
			this.sigmoid.setClampedTransitionAlpha(alpha + dt / this.transitionTime);
			this.adjustWeight(this.sigmoid.playLerp(this.instance.WeightCurrent, 0.05, alpha));
		}
	}

	public play(): void {
		this.instance.Play(this.fade, this.weight, this.speed);
		this.startedSignal.Fire();
	}

	public stop(): void {
		(<Writable<TrackComponent>>this).lastStopped = now();
		this.instance.Stop(this.fade);
	}

	public getDescription<T extends AttributeValue>(name: string): Maybe<T> {
		return this.instance.GetAttribute(name);
	}

	public pos(n: number): void {
		this.instance.TimePosition = n;
	}

	public subscribe<T extends unknown[] = unknown[]>(name: string, ...args: T): Signal<(args: T) => void> {
		const signal = <ReturnType<typeof this.subscribe>>new Signal();
		this.addToCleanup(
			OnKeyframeStepped.Connect((component, nameOf) => {
				if (this === component && nameOf === name) signal.Fire(args);
			}),
		);
		return signal;
	}

	public playing(): boolean {
		return now() - this.lastStopped > this.fade && this.instance.IsPlaying;
	}

	public length(): number {
		return this.instance.Length;
	}

	public destroy(): void {
		this.onDestroy();
	}

	public modifySpeed(this: Writable<TrackComponent>, to: number = this.speed): Writable<TrackComponent> {
		if (to !== this.speed) this.speed = to;
		if (this.playing()) this.adjustSpeed(to);
		return this;
	}

	public modifyWeight(this: Writable<TrackComponent>, to: number = this.weight): Writable<TrackComponent> {
		if (to !== this.weight) this.weight = to;
		if (this.playing()) this.adjustWeight(to);
		return this;
	}

	public modifyPriority(
		this: Writable<TrackComponent>,
		to: Enum.AnimationPriority = this.priority,
	): Writable<TrackComponent> {
		if (to !== this.priority) this.priority = to;
		this.instance.Priority = this.priority;
		return this;
	}

	public modifyLoop(this: Writable<TrackComponent>, to: boolean = this.looping): Writable<TrackComponent> {
		if (to !== this.looping) this.looping = to;
		this.instance.Looped = this.looping;
		return this;
	}

	public modifyFade(this: Writable<TrackComponent>, to: number = this.fade): Writable<TrackComponent> {
		if (to !== this.fade) this.fade = to;

		return this;
	}

	public modifySigmoidable(
		this: Writable<TrackComponent>,
		to: boolean = this.sigmoidEnabled,
	): Writable<TrackComponent> {
		if (to !== this.sigmoidEnabled) this.sigmoidEnabled = to;
		if (to) this.adjustSigmoid(0);
		else this.adjustSigmoid(1);
		return this;
	}

	public modifyLerpFade(this: Writable<TrackComponent>, to: number = this.fade): Writable<TrackComponent> {
		if (to !== this.transitionTime) this.transitionTime = to;
		return this;
	}

	public adjustSigmoid(to: number): number {
		return this.sigmoid.setClampedTransitionAlpha(to);
	}

	public adjustSpeed(to: number = this.speed): number {
		this.instance.AdjustSpeed(to);
		return to;
	}

	public adjustWeight(to: number = this.weight): number {
		this.instance.AdjustWeight(to);
		return this.instance.WeightCurrent;
	}

	private onEnded(): void {
		this.addToCleanup(
			this.instance.Ended.Connect(() => this.ended.Fire()),
			this.instance.Stopped.Connect(() => this.ended.Fire()),
		);
	}

	public static create(track: AnimationTrack): TrackComponent {
		return Dependency<Components>().addComponent(track);
	}
}
