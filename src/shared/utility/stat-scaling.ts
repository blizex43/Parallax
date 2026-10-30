import { StatTuning } from "shared/enums/scale-enum";
import type { ScalingDependencyKey, StatScaleOptions } from "shared/structs/scale";
import { scaleNumberWithPer } from "shared/utility/numbers";

export function scaleStatValue(stat: ScalingDependencyKey, value: number, options: StatScaleOptions = {}): number {
	return scaleNumberWithPer(
		value,
		options.per ?? StatTuning.per[stat],
		options.increment ?? StatTuning.increment[stat],
		options.minimum,
		options.maximum,
		options.trueScale,
		options.startValue,
	);
}

export function getStatRatio(stat: ScalingDependencyKey, value: number): number {
	return math.clamp(value / StatTuning.cap[stat], 0, 1);
}
