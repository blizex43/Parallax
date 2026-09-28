import type { Janitor } from "@rbxts/janitor";

export interface JournalCleanType {
	janitor: Janitor;
}

export type DamagePercentageType = Map<CharacterModel, PercentGroup>;

export interface PercentGroup {
	damage: number;
}
