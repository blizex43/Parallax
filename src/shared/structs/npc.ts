import type { PsuedoPlayerData } from "shared/data-models/player-data";
import type { AutomatedCharacterComponent } from "serverstorage/components/automated-character";
import type { AIData } from "./automated-character";
import type { Alias } from "./psuedo";
import type { AIBehaviors, NPCEntitys } from "shared/enums/npc-enum";
export type EntityType = ArrayUnionViewable<typeof NPCEntitys>;
export type BehaviorType = ArrayUnionViewable<typeof AIBehaviors>;
export interface CreateType {
	Type: BehaviorType;
	Enable?: boolean;
	Model?: string;
	Alias?: Alias;
	Stats?: Partial<PsuedoPlayerData>;
	Position?: Vector3;
}

export interface NPCType {
	component: AutomatedCharacterComponent;
	model: CharacterModel;
	ai: AIData;
}
