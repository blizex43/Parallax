import { Controller, type OnRender, type OnStart } from "@flamework/core";
import Signal from "@rbxts/signal";
import type { FieldOfViewProperties } from "shared/structs/field-of-view";
import type { CameraController, Cameras } from "./camera";
import { CameraState } from "shared/enums/config-enum";
import { Serializers } from "shared/network";
import { LinkSerializedRemote } from "client/decorators";
import { Events } from "client/network";
import { SuperJanitor } from "shared/classes/super-janitor";
import { Sigmoid } from "shared/classes/sigmoid";
import { noop } from "shared/utility/functions";
import type { JournalController } from "./journal";

@Controller()
export class FieldOfViewController implements OnRender, OnStart {
	public readonly fieldOfViewChanged: Signal<(properties: FieldOfViewProperties) => void> = new Signal();
	private readonly baseFieldOfView: number = 70;
	public readonly lastFieldOfViewProperties: Maybe<FieldOfViewProperties>;
	private readonly baseFade: number = 0.1;
	private readonly sigmoid: Sigmoid = new Sigmoid({ initTransition: 0 });
	private readonly tweenableFunctions: Record<string, (dt: number) => void> = {};
	public constructor(
		public readonly journal: JournalController,
		private readonly camera: CameraController,
	) { }
	public onStart(): void {
		this.journal.util
			.getPathChanged<boolean>(CameraState.FieldOfViewManipulate)
			.Connect((value) => this.onFieldOfViewChanged(value.newValue));
	}

	public onRender(dt: number): void {
		for (const [, func] of pairs(this.tweenableFunctions)) func(dt);
	}
	@LinkSerializedRemote(Events.camera.fieldofview, Serializers.fieldofview)
	public onPropertiesRecieved(this: Writable<FieldOfViewController>, properties: FieldOfViewProperties): void {
		this.lastFieldOfViewProperties = properties;
		this.journal.util.writeFor(
			CameraState.FieldOfViewManipulate,
			true,
			properties.duration,
			false,
			true,
			"FOVController",
		);
		this.fieldOfViewChanged.Fire(properties);
	}

	private onFieldOfViewChanged(value: boolean): void {
		if (!this.lastFieldOfViewProperties) return;
		const cameraName = this.camera.getCurrentName();
		if (value) this.installSigmoidFunction(cameraName, this.lastFieldOfViewProperties.value);
		else this.installSigmoidFunction(cameraName, this.baseFieldOfView);
	}

	private installSigmoidFunction(cameraName: keyof Cameras = this.camera.getCurrentName(), result: number): void {
		const camera = this.camera.get(cameraName).instance;
		const bufferName = `CameraFieldOfView${cameraName}`;
		SuperJanitor.del(bufferName);
		const tweenFunc = (dt: number): void => {
			const alpha = this.sigmoid.getTransitionAlpha();
			this.sigmoid.setClampedTransitionAlpha(
				alpha + dt / (this.lastFieldOfViewProperties?.fade ?? this.baseFade),
			);
			camera.FieldOfView = this.sigmoid.playLerp(camera.FieldOfView, result, alpha);
		};
		this.tweenableFunctions[bufferName] = tweenFunc;
		SuperJanitor.set(
			bufferName,
			() => noop(delete this.tweenableFunctions[bufferName], this.sigmoid.setClampedTransitionAlpha(0)),
			this.lastFieldOfViewProperties!.duration,
		);
	}
}
