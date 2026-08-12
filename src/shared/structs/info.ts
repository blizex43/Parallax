import type {
	Authorities,
	Clans,
	EyeColors,
	Eyes,
	HairColors,
	Heights,
	Mouths,
	Noses,
	RollTypes,
	Traits,
} from "shared/enums/info-enum";
export type ClanRarities = keyof typeof Clans;
export type TraitRarities = keyof typeof Traits;
export type HairRarities = keyof typeof HairColors;
export type HeightRarities = keyof typeof Heights;
export type EyeColorRarities = keyof typeof EyeColors;
export type EyeRarities = keyof typeof Eyes;
export type MouthRarities = keyof typeof Mouths;
export type NoseRarities = keyof typeof Noses;
export type AcceptableRarityValue = Color3 | string[] | number[] | "Randomized";
export type FinishedRarityValue = Color3 | number | string | "Randomized";
export type RarityType =
	| HairRarities
	| HeightRarities
	| EyeColorRarities
	| TraitRarities
	| ClanRarities
	| EyeRarities
	| MouthRarities
	| NoseRarities;
export type RarityChild = {
	weight: number;
	type: "Normal" | "Random";
	value: AcceptableRarityValue;
};
export type RarityTree = {
	[x in Partial<RarityType>]: RarityChild;
};
export type ClanLiterals = (typeof Clans)[ClanRarities]["value"][number];
export type TraitLiterals = (typeof Traits)[TraitRarities]["value"][number];
export type AuthorityLiterals = (typeof Authorities)[number];
export type RollType = (typeof RollTypes)[number];
export interface RollOptions {
	exclude?: RarityType[];
}
