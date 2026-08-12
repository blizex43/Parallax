import { ClashProperties } from "./clash-enum";

export const enum FieldOfViewPresets {
	Clash,
}

export const FieldOfViewPresetValues = <const>{
	[FieldOfViewPresets.Clash]: {
		duration: ClashProperties.Duration,
		value: 40,
		fade: ClashProperties.Duration / 2,
	},
};
