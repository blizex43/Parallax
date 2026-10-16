import type { AutomatedCharacterComponent } from "serverstorage/components/automated-character";
import type { AIBehaviors, AILevels, NPCAliasTable, NPCEntitys, NPCPresets } from "shared/enums/npc-enum";
import type { PsuedoDefaultData } from "./psuedo";
import type { Brain } from "serverstorage/components/brain";
export type EntityType = ArrayUnionViewable<typeof NPCEntitys>;
export type BehaviorType = ArrayUnionViewable<typeof AIBehaviors>;
export type AILevelType = ArrayUnionViewable<typeof AILevels>;
export type AIBehaviorType = ArrayUnionViewable<typeof AIBehaviors>;
export type NPCAliasType = ArrayUnionViewable<typeof NPCAliasTable>;
export type NPCPresetType = ArrayUnionViewable<typeof NPCPresets>;
export interface EntityCreationProperties {
	entityIdentity: EntityType;
	mastery?: AILevelType;
	behavior?: AIBehaviorType;
	statRange?: NPCAliasType;
	preset?: NPCPresetType;
	model?: string | CharacterModel;
	position?: Vector3;
}

export interface NPCProperties {
	component: AutomatedCharacterComponent;
	model: CharacterModel;
	data: PsuedoDefaultData;
	brain: Brain;
}

export type NPCType = NPCProperties;
