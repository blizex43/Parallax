import { Dependency } from "@flamework/core";
import { Component, type Components } from "@flamework/components";
import { Workspace as World } from "@rbxts/services";
import { $nameof } from "rbxts-transform-debug";
import { Player } from "client/utility";
import { CameraComponent } from "client/base-components/camera";
import type { CameraController } from "client/controllers/camera";
import { Spring } from "shared/classes/spring";
import { CameraHeadSpringPosition, CameraSpringInVelocity, CameraSpringOutVelocity } from "shared/enums/camera-enum";
import { CharacterController } from "client/controllers/character";
const { min } = math;
@Component({ tag: $nameof<DynamicCamera>() })
export class DynamicCamera extends CameraComponent {
	private readonly spring = new Spring(5, 50, 4, 4);
	private readonly headSpring = new Spring(4, 50, 4, 10);
	public currentTransition: boolean = false;
	private initialized: boolean = false;
	constructor(private character: CharacterController) {
		super();
	}
	public static create(controller: CameraController): DynamicCamera {
		const components = Dependency<Components>();
		const camera = World.CurrentCamera!.Clone();
		camera.Name = $nameof<DynamicCamera>();
		camera.VRTiltAndRollEnabled = true;
		camera.Parent = controller.cameraStorage;
		return components.addComponent(camera);
	}

	onRender(dt: number) {
		const root = this.character.getRoot();
		const head = this.character.getHead();
		if (!root || !head) return;
		if (!this.initialized) {
			this.initialized = true;
			super.setCFrame(head.CFrame);
			this.spring.position = Vector3.zero;
			this.headSpring.position = Vector3.zero;
		}
		dt = min(dt, 1 / 30);
		this.spring.update(dt);
		this.updateHeadSpring();
		this.headSpring.update(dt);

		let currentCFrame = this.instance.CFrame;

		currentCFrame = currentCFrame.mul(new CFrame(this.spring.position));
		currentCFrame = currentCFrame.mul(new CFrame(this.headSpring.position));
		super.setCFrame(currentCFrame);
	}

	public isFar(cameraCFrame: CFrame): boolean {
		const head = this.character.getHead();
		if (!head) return true;
		return head.Position.sub(cameraCFrame.Position).Magnitude > 1;
	}

	public updateHeadSpring() {
		const head = this.character.getHead();
		const root = this.character.getRoot();
		if (!root || !head) return;

		const target = root.CFrame.VectorToObjectSpace(
			head.CFrame.Position.sub(root.Position.add(CameraHeadSpringPosition)),
		);

		this.headSpring.target = target;
	}

	public shift(on: boolean) {
		this.currentTransition = on;
		this.spring.target = on ? CameraSpringOutVelocity : CameraSpringInVelocity;
	}

	public override toggle(on: boolean): void {
		super.toggle(on);
		Player.CameraMode = on ? Enum.CameraMode.Classic : Player.CameraMode;
	}
}
