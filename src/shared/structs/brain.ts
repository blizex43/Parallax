import type { AIBehaviorType, AILevelType, EntityType, NPCPresetType } from "./npc";
import type { PsuedoDefaultData } from "./psuedo";

export interface Memories {
	data: PsuedoDefaultData;
	entityIdentity: EntityType;
	behavior?: AIBehaviorType;
	preset?: NPCPresetType;
	mastery: Maybe<AILevelType>;
}

export type NPCAction = "Idle" | "Walk" | "Run" | "Passive" | "Aggressive" | "Block" | "Attack";

export interface LogicFacts {
	targetPresent: boolean;
	inAttackRange: boolean;
	attackReady: boolean;
	passive: boolean;
	blocking: boolean;
	canRun: boolean;
}
