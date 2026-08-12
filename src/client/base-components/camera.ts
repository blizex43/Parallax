import { BaseComponent } from "@flamework/components";
import CameraShaker from "@rbxts/camera-shaker";
import { Workspace as World } from "@rbxts/services";

const { rad } = math;

export class CameraComponent<A extends {} = {}> extends BaseComponent<A, Camera> {
	public shaking: boolean = false;
	public readonly shaker: CameraShaker = ((): CameraShaker => {
		const shaker = new CameraShaker(
			Enum.RenderPriority.Camera.Value,
			(cframe) => ((<Vector3>this.lastShakeOffset) = cframe.Position),
		);
		shaker.Start();
		return shaker;
	})();
	protected readonly lastShakeOffset: Vector3 = Vector3.zero;
	protected readonly offsets: CFrame[] = [];

	public toggle(on: boolean): void {
		World.CurrentCamera = on ? this.instance : World.CurrentCamera;
	}

	public setCFrame(cframe: CFrame): void {
		this.instance.CFrame = this.setExternalAddons(cframe);
	}

	public setPosition(position: Vector3): void {
		this.setCFrame(new CFrame(position));
	}

	public setExternalAddons(cframe: CFrame): CFrame {
		if (this.shaking) cframe = cframe.mul(new CFrame(this.lastShakeOffset));
		return cframe;
	}

	public setOrientation(orientation: Vector3): void {
		this.setCFrame(
			this.instance.CFrame.mul(CFrame.Angles(rad(orientation.X), rad(orientation.Y), rad(orientation.Z))),
		);
	}

	public lookAt(position: Vector3): void {
		this.setCFrame(CFrame.lookAt(this.instance.CFrame.Position, position));
	}

	public getCFrame(): CFrame {
		return this.instance.CFrame;
	}
}
