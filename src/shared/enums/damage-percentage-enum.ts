import type { Janitor } from "@rbxts/janitor";
import type { WebsocketUtilities } from "shared/classes/websocket-utilities";

export interface ManagerCleanType {
	manager: WebsocketUtilities;
	janitor: Janitor;
}

export type DamagePercentageType = Map<CharacterModel, PercentGroup>;

export interface PercentGroup {
	damage: number;
}
