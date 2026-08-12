import type { MockScaleDependencies, ScaleClass, ScalingDependencyKey } from "shared/structs/scale";

export const MaxStatsScaled: Record<ScalingDependencyKey, number> = {
	height: 2,
	impulse: 2000,
	strength: 7000,
	vigor: 2500,
	intellect: 700,
	agility: 2000,
	stamina: 3700,
	upperBodyMuscle: 3500,
	lowerBodyMuscle: 3500,
	fat: 400,
};

export const BaseDensity = <const>{
	Muscle: 120,
	Fat: 25,
};

export const BuffPerStat: Record<ScalingDependencyKey, number> = {
	strength: 1,
	impulse: 1,
	vigor: 1,
	agility: 1,
	intellect: 1,
	stamina: 1,
	height: 0.01,
	upperBodyMuscle: 1,
	lowerBodyMuscle: 1,
	fat: 1,
};

export const IncrementPerStat: Record<ScalingDependencyKey, number> = {
	strength: 0.02, //  damage per 1
	impulse: 0.0003, // animation speed per 1
	vigor: 1, // health per 1
	agility: 0.02, // runspeed speed per 1
	intellect: 1, // intellect/anomaly mastery per 1
	stamina: 1, // stamina per 1
	height: 0.003, // range per 0.01
	upperBodyMuscle: 0.016, // damage per 1
	lowerBodyMuscle: 0.016, // damage per 1
	fat: 1, // health per 1
};

export const StunIncrementPerStat: Partial<Record<ScalingDependencyKey, number>> = {
	upperBodyMuscle: 0.0003, // stun duration per 1 max 1750
	lowerBodyMuscle: 0.0003, // stun duration per 1 max 1750
	fat: 0.001, // stun per 1 max scaled
};

export const DebuffIncrementPerStat: Partial<Record<ScalingDependencyKey, number>> = <const>{
	upperBodyMuscle: 0.00033, // debuff animation speed per 1 max 1500
	lowerBodyMuscle: 0.00033, // debuff animation speed per 1 max 1500
};

export const BaseHealthMultiplier = <const>{
	upperBodyMuscle: 0.0005,
	lowerBodyMuscle: 0.0005,
	fat: 0.008,
};

export const BaseStaminaMultiplier = <const>{
	upperBodyMuscle: 0.0005,
	lowerBodyMuscle: 0.0005,
	fat: 0.008,
};

export const IncrementPerSpeedStat = <const>{
	agility: IncrementPerStat.agility,
	upperBodyMuscle: 0.008, // debuff walkspeed per 1
	lowerBodyMuscle: 0.008, // debuff walkspeed per 1
	fat: 0.006, // debuff walkspeed per 1
};

export const StaminaDashIncrementPerStat = <const>{
	upperBodyMuscle: 0.001, // debuff stamina dash percentage per 1
	lowerBodyMuscle: 0.001, // debuff stamina dash percentage per 1
	fat: 0.001, // debuff stamina dash percentage per 1
};

export const StaminaSprintIncrementPerStat = <const>{
	upperBodyMuscle: 0.025, // debuff stamina sprint per 1
	lowerBodyMuscle: 0.03, // debuff stamina sprint per 1
	agility: 0.025, // debuff stamina sprint per 1
};

export const StatMultiplierPerSpeed = <const>{
	agility: 0.02,
	lowerBodyMuscle: 0.03, // NEGATIVE
	upperBodyMuscle: 0.03, // NEGATIVE
};

export const MaxDashScaled = <const>{
	dashdistance: {
		lowerBodyMuscle: 2500,
		agility: 2000,
	},
	dashpower: {
		lowerBodyMuscle: 2500,
		agility: 2000,
	},
};

export const MaxSpeedScaled = <const>{
	agility: 2000,
	lowerBodyMuscle: 2500,
	upperBodyMuscle: 2500,
};

export const ScaleMultipliers = {
	Base: 0.9,
	Muscle: 0.08,
	Fat: 0.08,
	Height: 0.1,
};
export const ScaleClassTable = <const>["Lower", "Lower-Mid", "Mid", "Mid-High", "High", "High-Ext", "Ext"];

export const StatMultiplierPerDash = <const>{
	dashdistance: {
		lowerBodyMuscle: 0.000008,
		agility: 0.000008,
	},
	dashpower: {
		lowerBodyMuscle: 0.035,
		agility: 0.005,
	},
};

export const MockScaleClassDependencies: Record<ScaleClass, MockScaleDependencies> = {
	Lower: {
		height: [0.8, 0.9],
		upperBodyMuscle: [20, 35],
		lowerBodyMuscle: [20, 35],
		strength: [200, 500],
		impulse: [200, 400],
		vigor: [200, 400],
		agility: [200, 400],
		intellect: [100, 200],
		stamina: [100, 300],
		fat: [0, 0],
	},
	"Lower-Mid": {
		height: [0.9, 1.0],
		upperBodyMuscle: [35, 50],
		lowerBodyMuscle: [35, 50],
		strength: [500, 900],
		impulse: [400, 700],
		vigor: [400, 700],
		agility: [400, 700],
		intellect: [200, 350],
		stamina: [400, 600],
		fat: [0, 0],
	},
	Mid: {
		height: [1.0, 1.05],
		upperBodyMuscle: [50, 65],
		lowerBodyMuscle: [50, 65],
		strength: [900, 1400],
		impulse: [700, 1000],
		vigor: [700, 1000],
		agility: [700, 1000],
		intellect: [350, 500],
		stamina: [600, 1000],
		fat: [0, 0],
	},
	"Mid-High": {
		height: [1.05, 1.1],
		upperBodyMuscle: [65, 80],
		lowerBodyMuscle: [65, 80],
		strength: [1400, 2000],
		impulse: [1000, 1300],
		vigor: [1000, 1300],
		agility: [1000, 1300],
		intellect: [500, 650],
		stamina: [1000, 1300],
		fat: [0, 0],
	},
	High: {
		height: [1.1, 1.15],
		upperBodyMuscle: [80, 95],
		lowerBodyMuscle: [80, 95],
		strength: [2000, 2700],
		impulse: [1300, 1600],
		vigor: [1300, 1600],
		agility: [1300, 1600],
		intellect: [650, 800],
		stamina: [1300, 1600],
		fat: [0, 0],
	},
	"High-Ext": {
		height: [1.15, 1.2],
		upperBodyMuscle: [95, 110],
		lowerBodyMuscle: [95, 110],
		strength: [2700, 3400],
		impulse: [1600, 1800],
		vigor: [1600, 1800],
		agility: [1600, 1800],
		intellect: [800, 900],
		stamina: [1600, 1800],
		fat: [0, 0],
	},
	Ext: {
		height: [1.2, 1.25],
		upperBodyMuscle: [110, 120],
		lowerBodyMuscle: [110, 120],
		strength: [3400, 4000],
		impulse: [1800, 2000],
		vigor: [1800, 2000],
		agility: [1800, 2000],
		intellect: [900, 1000],
		stamina: [1800, 2000],
		fat: [0, 0],
	},
};
