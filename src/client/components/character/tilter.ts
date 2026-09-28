import { Dependency, type OnRender } from "@flamework/core";
import { Component, type Components } from "@flamework/components";
import { $nameof } from "rbxts-transform-debug";
import InstanceExtendable from "shared/base-components/instance";
import type { LogStart, OnCharacterRemove } from "shared/hooks";
import { BLEND_DAMPING, BLEND_SPEED, MAX_TILT_ANGLE, TILT_SPEED } from "shared/enums/cframe-enum";

interface Attributes {
	speed: number;
	maxAngle: number;
	blend_speed: number;
	blend_damping: number;
}

@Component({
	tag: $nameof<Tilter>(),
	defaults: {
		speed: TILT_SPEED,
		maxAngle: MAX_TILT_ANGLE,
		blend_speed: BLEND_SPEED,
		blend_damping: BLEND_DAMPING,
	},
})
export class Tilter
	extends InstanceExtendable<Attributes, CharacterModel>
	implements OnRender, LogStart, OnCharacterRemove
{
	public readonly enabled: boolean = false;
	public readonly frozen: boolean = false;
	private readonly motor: Motor6D = this.instance.HumanoidRootPart.RootJoint;
	private readonly motorCFrame: CFrame = this.motor.C0;
	private position: CFrame = new CFrame();
	private blend: number = 0;
	private blendVector: number = 0;

	public static create(character: CharacterModel): Tilter {
		const components = Dependency<Components>();
		return components.addComponent(character);
	}

	public onRender(dt: number): void {
		if (this.frozen) return;
		this.update(dt, this.enabled);
	}

	public onCharacterRemove(): void {
		this.onDestroy();
	}

	private update(dt: number, enabled = true) {
		const root = this.instance.FindFirstChild("HumanoidRootPart");
		const humanoid = this.instance.FindFirstChild("Humanoid");

		if (!root || !humanoid) return;
		const look = root.CFrame.LookVector;
		const yaw = math.atan2(-look.X, -look.Z);
		const yawCFrame = CFrame.Angles(0, yaw, 0);

		const moveDirection = yawCFrame.VectorToObjectSpace(humanoid.MoveDirection);

		const blend = this.updateShiftlockBlend(enabled ? 1 : 0, dt);

		const alpha = 1 - math.exp(-this.attributes.speed * dt);

		const targetAngle = CFrame.Angles(
			math.rad(-moveDirection.Z) * MAX_TILT_ANGLE * blend,
			math.rad(-moveDirection.X) * MAX_TILT_ANGLE * blend,
			0,
		);

		this.position = this.position.Lerp(targetAngle, alpha);

		root.RootJoint.C0 = this.motorCFrame.mul(this.position);
	}

	private updateShiftlockBlend(target: number, dt: number): number {
		const displacement = this.blend - target;
		const acceleration =
			-2 * this.attributes.blend_damping * this.attributes.blend_speed * this.blendVector -
			this.attributes.blend_speed * this.attributes.blend_speed * displacement;

		this.blendVector += acceleration * dt;
		this.blend = math.clamp(this.blend + this.blendVector * dt, 0, 1);
		if ((this.blend === 0 && this.blendVector < 0) || (this.blend === 1 && this.blendVector > 0)) {
			this.blendVector = 0;
		}
		return this.blend;
	}

	public enable(this: Writable<Tilter>) {
		this.enabled = true;
	}

	public disable(this: Writable<Tilter>) {
		this.enabled = false;
	}

	public freeze(this: Writable<Tilter>) {
		this.frozen = true;
	}

	public thaw(this: Writable<Tilter>) {
		this.frozen = false;
	}
}
