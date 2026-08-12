import type { PlayerData, PlayerDataKeys } from "shared/data-models/player-data";
import { MaxStatsScaled, ScaleMultipliers } from "shared/enums/scale-enum";
import { CharacterDependency } from "shared/structs/linked-dependency";
import { scaleNumberWithPer } from "shared/utility/numbers";
interface ScaleDependencies {
	height: number;
	fat: number;
	muscle: {
		lower: number;
		upper: number;
	};
}

export class ScaleDependency implements CharacterDependency {
	public readonly changableKeys: PlayerDataKeys[] = [
		"height",
		"heightboost",
		"upperBodyMuscle",
		"lowerBodyMuscle",
		"fat",
	];
	public readonly priority = 6;
	async onWrite(_: Player, playerData: PlayerData, character: CharacterModel): Promise<void> {
		const dependency = this.makeScaleDependency(playerData);
		this.applyHeight(character, character.Humanoid, dependency);
	}

	async onChanged(player: Player, playerData: PlayerData): Promise<void> {
		const character = <Maybe<CharacterModel>>player.Character;
		if (!character) return;
		const dependency = this.makeScaleDependency(playerData);
		this.applyHeight(character, character.Humanoid, dependency);
	}

	/* ----------------------------- MAIN APPLY ----------------------------- */

	private applyHeight(character: CharacterModel, humanoid: Humanoid, data: ScaleDependencies) {
		this.setHeight(character, humanoid, data.height);
		this.scaleDensity(character, data);
	}

	/* ----------------------------- HEIGHT ----------------------------- */

	private setHeight(character: CharacterModel, humanoid: Humanoid, height: number) {
		humanoid.AutomaticScalingEnabled = false;

		const parts = this.getBaseParts(character);

		for (const part of parts) {
			if (!part) continue;

			if (!part.GetAttribute("DefaultSize")) {
				part.SetAttribute("DefaultSize", part.Size);
			}
		}

		for (const part of parts) {
			if (!part) continue;

			const base = part.GetAttribute("DefaultSize") as Vector3;
			part.Size = new Vector3(base.X, base.Y * height, base.Z);
		}

		for (const instance of character.GetDescendants()) {
			if (!instance.IsA("Motor6D")) continue;

			const joint = instance;

			if (!joint.GetAttribute("DefaultC0")) {
				joint.SetAttribute("DefaultC0", joint.C0);
				joint.SetAttribute("DefaultC1", joint.C1);
			}

			const baseC0 = joint.GetAttribute("DefaultC0") as CFrame;
			const baseC1 = joint.GetAttribute("DefaultC1") as CFrame;

			const yOffset0 = baseC0.Position.Y * (height - 1);
			const yOffset1 = baseC1.Position.Y * (height - 1);

			joint.C0 = baseC0.mul(new CFrame(0, yOffset0, 0));
			joint.C1 = baseC1.mul(new CFrame(0, yOffset1, 0));

			if (joint.Name === "Neck") {
				const y = baseC0.Position.Y * height;
				joint.C0 = new CFrame(baseC0.Position.X, y, baseC0.Position.Z).mul(baseC0.Rotation);
				joint.C1 = baseC1;
			}
		}

		humanoid.HipHeight = height - 1;
	}

	/* ----------------------------- WIDTH SCALING ----------------------------- */

	private scaleDensity(character: CharacterModel, data: ScaleDependencies) {
		const parts = this.getBaseParts(character);
		const [torso, leftArm, rightArm, leftLeg, rightLeg] = parts;

		for (const part of parts) {
			if (!part) continue;

			if (!part.GetAttribute("DefaultSize")) {
				part.SetAttribute("DefaultSize", part.Size);
			}
		}

		const fatFactor = scaleNumberWithPer(
			data.fat,
			MaxStatsScaled.fat,
			ScaleMultipliers.Fat,
			0,
			MaxStatsScaled.fat,
			true,
		);

		const leanUpperFactor = scaleNumberWithPer(
			data.muscle.upper,
			MaxStatsScaled.upperBodyMuscle,
			ScaleMultipliers.Muscle * 9,
			120,
			MaxStatsScaled.upperBodyMuscle,
			true,
		);

		const leanLowerFactor = scaleNumberWithPer(
			data.muscle.lower,
			MaxStatsScaled.lowerBodyMuscle,
			ScaleMultipliers.Muscle * 9,
			120,
			MaxStatsScaled.lowerBodyMuscle,
			true,
		);
		const upperFactor =
			scaleNumberWithPer(
				data.muscle.upper,
				MaxStatsScaled.upperBodyMuscle,
				ScaleMultipliers.Muscle,
				120,
				MaxStatsScaled.upperBodyMuscle,
				true,
			) + leanUpperFactor;

		const lowerFactor =
			scaleNumberWithPer(
				data.muscle.lower,
				MaxStatsScaled.lowerBodyMuscle,
				ScaleMultipliers.Muscle,
				120,
				MaxStatsScaled.lowerBodyMuscle,
				true,
			) + leanLowerFactor;

		const heightFactor = scaleNumberWithPer(data.height - 1, 1, ScaleMultipliers.Height, 0, 1, true);

		if (torso) {
			const base = torso.GetAttribute("DefaultSize") as Vector3;
			const scale = ScaleMultipliers.Base + upperFactor / 5 + fatFactor + heightFactor;

			torso.Size = new Vector3(base.X * scale, torso.Size.Y, base.Z * scale);
		}

		for (const arm of [leftArm, rightArm]) {
			if (!arm) continue;

			const base = arm.GetAttribute("DefaultSize") as Vector3;
			const scale = ScaleMultipliers.Base + upperFactor + fatFactor + heightFactor;

			arm.Size = new Vector3(base.X * scale, arm.Size.Y, base.Z * scale);

			this.adjustArmJoints(arm, torso);
		}

		for (const leg of [leftLeg, rightLeg]) {
			if (!leg) continue;

			const base = leg.GetAttribute("DefaultSize") as Vector3;
			const scale = ScaleMultipliers.Base + lowerFactor + fatFactor + heightFactor;

			leg.Size = new Vector3(base.X * scale, leg.Size.Y, base.Z * scale);

			this.adjustLegJoints(leg, torso);
		}
	}

	/* ----------------------------- JOINT FIX ----------------------------- */

	private adjustArmJoints(arm: BasePart, torso?: BasePart) {
		if (!torso) return;

		const armBase = arm.GetAttribute("DefaultSize") as Vector3;
		const torsoBase = torso.GetAttribute("DefaultSize") as Vector3;

		const armDelta = (arm.Size.X - armBase.X) / 2;
		const torsoDelta = (torso.Size.X - torsoBase.X) / 2;

		const offset = armDelta + torsoDelta;

		const left = torso.FindFirstChild("Left Shoulder") as Maybe<Motor6D>;
		const right = torso.FindFirstChild("Right Shoulder") as Maybe<Motor6D>;

		if (left) this.offsetJointX(left, offset, -1);
		if (right) this.offsetJointX(right, offset, 1);
	}

	private adjustLegJoints(leg: BasePart, torso?: BasePart) {
		if (!torso) return;

		const legBase = leg.GetAttribute("DefaultSize") as Vector3;
		const delta = (leg.Size.X - legBase.X) / 2;

		const left = torso.FindFirstChild("Left Hip") as Maybe<Motor6D>;
		const right = torso.FindFirstChild("Right Hip") as Maybe<Motor6D>;

		if (left) this.offsetJointX(left, delta, -1);
		if (right) this.offsetJointX(right, delta, 1);
	}

	private offsetJointX(motor: Motor6D, offset: number, direction: number) {
		let baseC0 = motor.GetAttribute("DefaultC0") as Maybe<CFrame>;

		if (!baseC0) {
			baseC0 = motor.C0;
			motor.SetAttribute("DefaultC0", baseC0);
		}

		const current = motor.C0;

		const newPos = new Vector3(baseC0.Position.X + offset * direction, current.Position.Y, current.Position.Z);

		motor.C0 = new CFrame(newPos).mul(baseC0.Rotation);
	}

	/* ----------------------------- HELPERS ----------------------------- */

	private getBaseParts(character: CharacterModel): Maybe<BasePart>[] {
		return [
			character.FindFirstChild("Torso"),
			character.FindFirstChild("Left Arm"),
			character.FindFirstChild("Right Arm"),
			character.FindFirstChild("Left Leg"),
			character.FindFirstChild("Right Leg"),
		];
	}

	private makeScaleDependency(playerData: PlayerData): ScaleDependencies {
		return {
			height: playerData.height + (playerData.reinholdBoost ? 0.1 : 0),
			fat: playerData.fat,
			muscle: {
				upper: playerData.upperBodyMuscle,
				lower: playerData.lowerBodyMuscle,
			},
		};
	}
}
