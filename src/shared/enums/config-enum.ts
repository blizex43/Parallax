import Signal from "@rbxts/signal";
import { HumanoidBaseWalkspeed } from "./humanoid-enum";

interface MovementSettings {
	speed: number;
	priority: number;
	overrideFade?: number;
	condition?: () => boolean;
}
interface IncrementalMovementSettings {
	[percent: number]: {
		minRange: number;
		startPercent: number;
		maxPercent: number;
	};
}
export const enum VitalityState {
	Health = "Health",
	Stamina = "Stamina",
	Iframes = "Iframes",
}

export const enum AIBlackboardKey {
	Aggression = "Aggression",
	IsStunned = "IsStunned",
	IsInvincible = "IsInvincible",
	ChaseTarget = "ChaseTarget",
	BlockDefensively = "BlockDefensively",
	TakeDamageOnly = "TakeDamageOnly",
	CombatRange = "CombatRange",
	AttackCooldown = "AttackCooldown",
	PatrolRadius = "PatrolRadius",
	DetectionRange = "DetectionRange",
	RetreatThreshold = "RetreatThreshold",
	MovementSpeed = "MovementSpeed",
	StrafeDistance = "StrafeDistance",
	TargetPriority = "TargetPriority",
	PreferredRange = "PreferredRange",
}

export const enum MiscState {
	Debug = "Debug",
	Effect = "Effect",
	Cutscene = "CutsceneMode",
}

export const enum CameraState {
	Clashing = "ClashMode",
	Screenshake = "Screenshake",
	FieldOfViewManipulate = "FieldOfViewManipulate",
}

export const enum CombatState {
	AttackExecutable = "CanAttack",
	BlockBroken = "BlockBroken",
	CombatEquip = "CombatEquipped",
	MouseOne = "MouseInput1",
	MouseTwo = "MouseInput2",
	Windup = "Windup",
	Recovery = "Recovery",
	Endlag = "Endlag",
	Attacking = "Attacking",
	Stunned = "Stunned",
	FullStunned = "FullStunned",
	HyperArmor = "HyperArmor",
	Block = "Block",
	Exhausted = "Exhausted",
	Knocked = "Knocked",
	Ragdoll = "Ragdoll",
	Cooldowns = "Cooldowns",
	CombatTag = "CombatTag",
	CombatTagAccumulator = "CombatTagAccumulator",
	NoRotate = "NoRotate",
	StopHealthRegen = "NoHealthRegen",
}

export const enum Title {
	Player = "player",
	UI = "ui",
	Camera = "camera",
	AI = "ai",
	Movement = "movement",
	Combat = "combat",
	Health = "health",
	Other = "other",
}

/**
 * @uuid
 */
export const enum UUIDS {
	Hurtbox = "Hurtbox",
	Hitbox = "Hitbox",
}

export const enum MovementState {
	Shiftlocked = "Shiftlocked",
	Walk = "Walk",
	Idle = "Idle",
	Sprint = "Sprint",
	Jump = "Jump",
	Dash = "Dash",
	DashVertical = "Vertical",
	DashHorizontal = "Horizontal",
	NoMove = "NoMove",
	NoTrip = "NoTrip",
}

export const enum NPCResourcesState {
	AggressiveWeight = "AggressiveWeight",
	BlockWeight = "BlockWeight",
	DetectRange = "DetectRange",
	PassiveWeight = "PassiveWeight",
}

export const MovementConfig: Partial<Record<MovementState | CombatState | MiscState, MovementSettings>> = {
	[MovementState.Walk]: {
		speed: HumanoidBaseWalkspeed,
		priority: 1,
		condition: () => true,
	},
	[MovementState.Sprint]: {
		speed: 19,
		priority: 2,
	},
	[CombatState.Windup]: {
		speed: 3,
		priority: 3,
	},
	[CombatState.Recovery]: {
		speed: 3,
		priority: 3,
	},
	[CombatState.Attacking]: {
		speed: 2,
		priority: 4,
	},
	[CombatState.Stunned]: {
		speed: 5,
		priority: 8,
	},
	[MiscState.Cutscene]: {
		speed: 0,
		priority: 15,
	},
	[CombatState.FullStunned]: {
		speed: 0,
		priority: 9,
	},

	[CombatState.Ragdoll]: {
		speed: 0,
		priority: 11,
	},

	[CombatState.Knocked]: {
		speed: 0,
		priority: 12,
	},
	[CombatState.Block]: {
		speed: 6,
		priority: 7,
	},
	[CombatState.Exhausted]: {
		speed: 0,
		priority: 10,
	},
	[MovementState.NoMove]: {
		speed: 0,
		priority: 14,
		overrideFade: 0,
	},
};
export const IncrementalMovementConfig: Partial<Record<VitalityState, IncrementalMovementSettings>> = {
	[VitalityState.Health]: {
		50: {
			startPercent: 10,
			maxPercent: 35,
			minRange: 15,
		},
		15: {
			startPercent: 35,
			maxPercent: 60,
			minRange: 0,
		},
	},
};

export const StateEvents = <const>{
	[MovementState.Shiftlocked]: <Signal<() => void>>new Signal(),
	[MovementState.Sprint]: <Signal<(on: boolean) => void>>new Signal(),
	[CombatState.MouseOne]: <Signal<(on: boolean) => void>>new Signal(),
	[CombatState.MouseTwo]: <Signal<(on: boolean) => void>>new Signal(),
	[CombatState.Block]: <Signal<(on: boolean) => void>>new Signal(),
	[MovementState.Dash]: <Signal<() => void>>new Signal(),
	[CombatState.CombatEquip]: <Signal<() => void>>new Signal(),
};
