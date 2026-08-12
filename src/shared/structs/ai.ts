import type { FSM } from "@rbxts/state-management";
import type { WebsocketUtilities } from "shared/classes/websocket-utilities";
import { BlackboardStateType } from "./websocket";
import { AtomType } from "./atom";
import { AISharedBlackboardNames } from "shared/enums/sharable-ai-enum";
/**
 * AI behavior preset names
 */
export type AIPresetName = (typeof AISharedBlackboardNames)[number];
/**
 * AI behavior data structure containing the blackboard and preset type
 */
export interface AIPresetData {
	readonly blackboard: BlackboardStateType;
	readonly aiType: AIPresetName;
	readonly fsm?: FSM.FSM;
}

export interface AIData extends AIPresetData {
	readonly ws: WebsocketUtilities;
}

export interface AIPresetConfig {
	["Aggression"]: AtomType;
	["CombatRange"]: number;
	["AttackCooldown"]: number;
	["ChaseTarget"]: boolean;
	["BlockDefensively"]: boolean;
	["TakeDamageOnly"]: boolean;
	["PatrolRadius"]: number;
	["DetectionRange"]: number;
	["RetreatThreshold"]: number;
	["MovementSpeed"]: number;
	["StrafeDistance"]: number;
	["TargetPriority"]: number;
	["PreferredRange"]: number;
	["IsStunned"]: boolean;
	["IsInvincible"]: boolean;
}

/**
 * AI state information for tracking NPC behavior
 */
export interface AIState {
	readonly currentTarget: Maybe<CharacterModel>;
	readonly lastAttackTime: number;
	readonly isChasing: boolean;
	readonly aggressionLevel: number; // 0-1 scale
}
