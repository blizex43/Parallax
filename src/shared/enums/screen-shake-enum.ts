import { ClashProperties } from "./clash-enum";

export const enum ScreenShakePresets {
	Clash,
}
export const ScreenShakePresetValues = <const>{
	[ScreenShakePresets.Clash]: {
		magnitude: 5,
		roughness: 13,
		duration: ClashProperties.Duration,
		positionInfluence: new Vector3(1, 1.15, 0),
		rotationInfluence: new Vector3(1.25, 0, 4),
	},
};
