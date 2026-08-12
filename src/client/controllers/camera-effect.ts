import { Controller } from "@flamework/core";
import { CameraController } from "./camera";
import { CameraComponent } from "client/base-components/camera";

@Controller()
export class CameraEffectController {
	constructor(private readonly camera: CameraController) {}

	private get(): CameraComponent {
		return this.camera.get();
	}
}

