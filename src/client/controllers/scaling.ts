import { Controller } from "@flamework/core";
import type { ReplicaController } from "./replica";
import type { ClientScaleDashKeys } from "shared/structs/scale";
import {
	BaseDensity,
	BuffPerStat,
	IncrementPerSpeedStat,
	MaxDashScaled,
	MaxSpeedScaled,
	StatMultiplierPerDash,
} from "shared/enums/scale-enum";
import { MovementConfig, MovementState } from "shared/enums/config-enum";
import { HumanoidBaseWalkspeed } from "shared/enums/humanoid-enum";
import { scaleNumberWithPer, sum } from "shared/utility/numbers";
const { max } = math;
@Controller()
export class ScalingController {
	constructor(private readonly replica: ReplicaController) {}
	public getDash(baseDash: number, dashType: ClientScaleDashKeys): number {
		const data = this.replica.getData();
		const hostPer = StatMultiplierPerDash[dashType];
		const hostMax = MaxDashScaled[dashType];
		baseDash += scaleNumberWithPer(data.agility, BuffPerStat.agility, hostPer.agility, 0, hostMax.agility, true);
		baseDash += scaleNumberWithPer(
			data.lowerBodyMuscle,
			BuffPerStat.lowerBodyMuscle,
			hostPer.lowerBodyMuscle,
			BaseDensity.Muscle,
			hostMax.lowerBodyMuscle,
			true,
		);
		return baseDash;
	}

	public getSpeed(baseSpeed: number): number {
		const data = this.replica.getData();
		const totalMuscle = sum(data.lowerBodyMuscle, data.upperBodyMuscle);
		baseSpeed += scaleNumberWithPer(
			data.agility,
			BuffPerStat.agility,
			IncrementPerSpeedStat.agility,
			0,
			MaxSpeedScaled.agility,
		);
		baseSpeed -= scaleNumberWithPer(
			totalMuscle,
			BuffPerStat.lowerBodyMuscle,
			IncrementPerSpeedStat.lowerBodyMuscle,
			BaseDensity.Muscle,
			MaxSpeedScaled.lowerBodyMuscle,
		);
		baseSpeed -= scaleNumberWithPer(
			totalMuscle,
			BuffPerStat.upperBodyMuscle,
			IncrementPerSpeedStat.upperBodyMuscle,
			BaseDensity.Muscle,
			MaxSpeedScaled.upperBodyMuscle,
		);
		return max(baseSpeed, this.getNormalWalkSpeed());
	}

	public getNormalWalkSpeed(): number {
		return MovementConfig[MovementState.Walk]?.speed ?? HumanoidBaseWalkspeed;
	}
}
