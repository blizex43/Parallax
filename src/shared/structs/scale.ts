import type { ScaleClassTable } from "shared/enums/scale-enum";
export type ScaleClass = (typeof ScaleClassTable)[number];
export interface SizeParams {
	x: number;
	y: number;
	z: number;
}

export type ClientScaleDashKeys = "dashpower" | "dashdistance";

export type ScalingDependencyKey = keyof ScalingDependencies;

export type MockScaleDependencies = {
	[K in ScalingDependencyKey]: number[];
};

export type PartialMockScaleDependencies = Partial<MockScaleDependencies>;
export type NestedDashScaleType = {
	[K in ClientScaleDashKeys]: Partial<Record<ScalingDependencyKey, number>>;
};

export interface AttackParams {
	damage: number;
	stun: number;
	speed: number;
}

export interface ScalingParams {
	size: SizeParams;
	attack: AttackParams;
}

export interface ScalingDependencies {
	height: number;
	impulse: number;
	strength: number;
	vigor: number;
	stamina: number;
	intellect: number;
	agility: number;
	upperBodyMuscle: number;
	lowerBodyMuscle: number;
	fat: number;
}
export interface MakeshiftParams {
	manual?: ScalingDependencies;
	class?: ScaleClass;
}
