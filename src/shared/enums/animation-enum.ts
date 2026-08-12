import type { AnimationPropertyOverrides, AnimationPropertyOverridesEnum } from "shared/structs/animation";
export const baseFadeTime = 0.25;
export const OVERRIDES_TEMPLATE: AnimationPropertyOverrides = {
	weight: 1,
	loop: false,
	speed: 1,
	grade: 1,
	autoStoppable: true,
	priority: Enum.AnimationPriority.Action,
	acceptsSigmoid: true,
	fade: baseFadeTime,
	lerpFade: 0.2,
};
export const animationOverrides: AnimationPropertyOverridesEnum = {
	idle: {
		grade: -4,
		loop: true,
		priority: Enum.AnimationPriority.Core,
	},
	style_idle: {
		grade: -4,
		loop: true,
		priority: Enum.AnimationPriority.Core,
		acceptsSigmoid: false,
	},
	walk: {
		grade: -4,
		loop: true,
		priority: Enum.AnimationPriority.Idle,
	},
	style_walk: {
		grade: -4,
		loop: true,
		priority: Enum.AnimationPriority.Idle,
		acceptsSigmoid: false,
	},
	block: {
		loop: true,
		priority: Enum.AnimationPriority.Action2,
		grade: 2,
		lerpFade: 0.5,
	},
	exhausted: {
		grade: 2,
		loop: true,
	},
	sprint: {
		grade: -3,
		priority: Enum.AnimationPriority.Movement,
		loop: true,
		lerpFade: 0.3,
		acceptsSigmoid: false,
	},

	backdash: {
		loop: false,
		grade: -3,
		priority: Enum.AnimationPriority.Movement,
	},

	clash1: {
		loop: true,
		grade: 3,
		priority: Enum.AnimationPriority.Action3,
	},

	clash2: {
		loop: true,
		grade: 3,
		priority: Enum.AnimationPriority.Action3,
	},

	frontdash: {
		grade: -3,
		priority: Enum.AnimationPriority.Movement,
	},

	rightdash: {
		grade: -3,
		priority: Enum.AnimationPriority.Movement,
	},

	leftdash: {
		grade: -3,
		priority: Enum.AnimationPriority.Movement,
	},

	blockbroken1: {
		grade: 3,
		speed: 0.8,
		priority: Enum.AnimationPriority.Action3,
	},
	blockbroken2: {
		grade: 3,
		speed: 0.8,
		priority: Enum.AnimationPriority.Action3,
	},
	flinch1: {
		grade: -5,
		speed: 0.4,
		priority: Enum.AnimationPriority.Action,
		weight: 0.5,
	},
	flinch2: {
		grade: -5,
		speed: 0.4,
		priority: Enum.AnimationPriority.Action,
		weight: 0.5,
	},
	flinch3: {
		grade: -5,
		speed: 0.4,
		priority: Enum.AnimationPriority.Action,
		weight: 0.5,
	},
	blockreact1: {
		priority: Enum.AnimationPriority.Action3,
		weight: 0.35,
	},
	blockreact2: {
		priority: Enum.AnimationPriority.Action3,
		weight: 0.35,
	},
	blockreact3: {
		priority: Enum.AnimationPriority.Action3,
		weight: 0.35,
	},

	knockback1: {
		grade: 3,
		priority: Enum.AnimationPriority.Action3,
	},
};
export const movementAnimationLiterals = <const>[
	"idle",
	"walk",
	"sprint",
	"dashcancelback",
	"dashcancelfront",
	"dashcancelleft",
	"dashcancelright",
	"frontdash",
	"leftdash",
	"rightdash",
	"backdash",
];

export const combatAnimationLiterals = <const>[
	"block",
	"blockbroken1",
	"blockbroken2",
	"blockreact1",
	"blockreact2",
	"blockreact3",
	"exhausted",
	"flinch1",
	"flinch2",
	"flinch3",
	"gb",
	"knockback1",
	"recover",
	"clash1",
	"clash2",
];

export const styleAnimationLiterals = <const>[
	"light1",
	"light2",
	"light3",
	"light4",
	"light5",
	"idle",
	"walk",
	"heavy",
];
export const styleClientSafeLiterals = <const>["style_idle", "style_walk"];
