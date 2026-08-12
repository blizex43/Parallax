import type { PsuedoPlayerData } from "shared/data-models/player-data";
import type { AutomatedCharacterComponent } from "serverstorage/components/automated-character";
import { AIData, AIPresetName } from "./ai";
import { Alias } from "./psuedo";

export interface CreateType {
	Type: AIPresetName;
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
