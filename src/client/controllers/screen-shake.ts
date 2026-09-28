import { Controller, type OnStart } from "@flamework/core";
import Signal from "@rbxts/signal";
import { LinkSerializedRemote } from "client/decorators";
import { Events } from "client/network";
import { Serializers } from "shared/network";
import type { ScreenshakePropertiesType } from "shared/structs/screen-shake";
import { CameraState } from "shared/enums/config-enum";
import type { CameraController } from "./camera";
import { SuperJanitor } from "shared/classes/super-janitor";
import { noop } from "shared/utility/functions";
import type { JournalController } from "./journal";

@Controller()
export class ScreenShakeController implements OnStart {
	public readonly lastUsedScreenshake: Maybe<ScreenshakePropertiesType>;
	public readonly propertiesChanged: Signal<(properties: ScreenshakePropertiesType) => void> = new Signal();
	public constructor(
		public readonly journal: JournalController,
		private readonly camera: CameraController,
	) {}
	public onStart(): void {
		this.journal.util
			.getPathChanged<boolean>(CameraState.Screenshake)
			.Connect((value) => this.onScreenshakeChanged(value.newValue));
	}
	@LinkSerializedRemote(Events.camera.screenshake, Serializers.screenshake)
	public onPropertiesRecieved(this: Writable<ScreenShakeController>, properties: ScreenshakePropertiesType): void {
		this.lastUsedScreenshake = properties;
		this.journal.util.writeFor(CameraState.Screenshake, true, properties.duration, false, true);
		this.propertiesChanged.Fire(properties);
	}

	private onScreenshakeChanged(value: boolean): void {
		if (!this.lastUsedScreenshake) return;
		const cameraName = this.camera.getCurrentName();
		const bufferName = `CameraShake${cameraName}`;
		SuperJanitor.del(bufferName);
		if (value) {
			const instance = this.camera.shakeCamera(this.lastUsedScreenshake, cameraName);
			this.camera.changeCameraScreenshake(true, cameraName);
			SuperJanitor.set(
				bufferName,
				() =>
					noop(
						this.camera.changeCameraScreenshake(false, cameraName),
						instance.StartFadeOut(instance.fadeOutDuration),
					),
				this.lastUsedScreenshake.duration,
			);
		}
	}
}
