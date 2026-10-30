import { Controller } from "@flamework/core";
import type { ReplicaController } from "./replica";
import type { ClientScaleDashKeys } from "shared/structs/scale";
import { StatTuning } from "shared/enums/scale-enum";
import { MovementConfig, MovementState } from "shared/enums/config-enum";
import { HumanoidBaseWalkspeed } from "shared/enums/humanoid-enum";
import { scaleNumberWithPer, sum } from "shared/utility/numbers";
const { max } = math;
@Controller()
export class ScalingController {
	constructor(private readonly replica: ReplicaController) {}
	public getDash(baseDash: number, dashType: ClientScaleDashKeys): number {
		const data = this.replica.getData();
		const isDistance = dashType === "dashdistance";
		const agilityIncrement = isDistance
			? StatTuning.dash.increment.distance
			: StatTuning.dash.increment.powerAgility;
		const muscleIncrement = isDistance ? StatTuning.dash.increment.distance : StatTuning.dash.increment.powerMuscle;
		const agilityCap = StatTuning.dash.cap.agility;
		const muscleCap = isDistance ? StatTuning.dash.cap.distanceMuscle : StatTuning.dash.cap.powerMuscle;
		baseDash += scaleNumberWithPer(data.agility, StatTuning.per.agility, agilityIncrement, 0, agilityCap, true);
		baseDash += scaleNumberWithPer(
			data.lowerBodyMuscle,
			StatTuning.per.lowerBodyMuscle,
			muscleIncrement,
			StatTuning.baseDensity.muscle,
			muscleCap,
			true,
		);
		return baseDash;
	}

	public getSpeed(baseSpeed: number): number {
		const data = this.replica.getData();
		const totalMuscle = sum(data.lowerBodyMuscle, data.upperBodyMuscle);
		baseSpeed += scaleNumberWithPer(
			data.agility,
			StatTuning.per.agility,
			StatTuning.runSpeed.agilityPerPoint,
			0,
			StatTuning.runSpeed.cap.agility,
		);
		baseSpeed -= scaleNumberWithPer(
			totalMuscle,
			StatTuning.per.lowerBodyMuscle,
			StatTuning.runSpeed.musclePenaltyPerPoint,
			StatTuning.baseDensity.muscle,
			StatTuning.runSpeed.cap.muscle,
		);
		return max(baseSpeed, this.getNormalWalkSpeed());
	}

	public getNormalWalkSpeed(): number {
		return MovementConfig[MovementState.Walk]?.speed ?? HumanoidBaseWalkspeed;
	}
}
