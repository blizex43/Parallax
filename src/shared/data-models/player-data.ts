import type { DataType } from "@rbxts/flamework-binary-serializer";
import type { AttackLiterals, ModeLiterals } from "shared/structs/attack";
import type { AuthorityLiterals, ClanLiterals, TraitLiterals } from "shared/structs/info";
import { Styles } from "shared/structs/styles";
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type PlayerDataKeys = keyof PlayerData;
export interface GlobalData {}
export interface PsuedoPlayerData {
	/**
	 * @readonly DataType numbers
	 */
	readonly marking: DataType.u8;
	readonly mouth: DataType.u8;
	readonly eyes: DataType.u8;
	readonly nose: DataType.u8;
	readonly shirt: DataType.u8;
	readonly pants: DataType.u8;
	readonly height: DataType.u8;
	readonly impulse: DataType.u16;
	readonly intellect: DataType.u16;
	readonly strength: DataType.u16;
	readonly stamina: DataType.u16;
	readonly agility: DataType.u16;
	readonly vigor: DataType.u16;
	readonly fat: DataType.u16;
	readonly lowerBodyMuscle: DataType.u16;
	readonly upperBodyMuscle: DataType.u16;
	readonly superDurability: DataType.u16;
	readonly superMuscle: DataType.u16;
	readonly superStrength: DataType.u16;
	readonly superSpeed: DataType.u16;
	readonly superStamina: DataType.u16;
	readonly superSwingSpeed: DataType.u16;
	/**
	 * @readonly DataType string
	 */
	readonly firstName: string;
	readonly customClan: string;
	readonly mode: ModeLiterals | "None";
	readonly style: Styles;
	readonly stance: string;
	readonly title: string;
	readonly clan: ClanLiterals;
	readonly trait: TraitLiterals;
	readonly gender: "Male" | "Female";
	/**
	 * @readonly DataType Color
	 */
	readonly auraColor: Color3;
	readonly eyeColor: Color3;
	readonly hairColor: Color3;
	/**
	 * @readonly DataType Boolean
	 */
	readonly glowingEyes: boolean;
	readonly inCombat: boolean;
	readonly enableTitle: boolean;
	/**
	 * @readonly DataTypes string[]
	 */
	readonly authorities: AuthorityLiterals[];
	readonly modes: ModeLiterals[];
	readonly skills: AttackLiterals[];
}

export interface PlayerData extends PsuedoPlayerData {
	/**
	 * @readonly DataType numbers
	 */
	readonly groupId: DataType.u8;
	readonly fatigue: DataType.u8;
	readonly styleExp: DataType.u8;
	readonly jailTime: DataType.u8;
	readonly hunger: DataType.u8;
	readonly heightboost: DataType.u8;
	readonly noobProtection: DataType.u16;
	readonly userId: DataType.u16;
	readonly bank: DataType.f32;
	readonly money: DataType.f32;
	readonly playtime: DataType.f32;
	/**
	 * @readonly DataType Boolean
	 */
	readonly firstTimeSpawned: boolean;
	readonly reinholdBoost: boolean;
	readonly inCriminal: boolean;
	readonly serverInit: boolean;
	readonly gameInit: boolean;
	/**
	 * @readonly DataTypes string[]
	 */
	readonly purchaseHistory: string[];
	readonly inventory: string[];
}

export const INITIAL_GLOBAL_DATA: GlobalData = {};

export const INITIAL_PSUEDO_DATA: PsuedoPlayerData = {
	marking: 0,
	mouth: 0,
	eyes: 0,
	nose: 0,
	shirt: 15704756937,
	pants: 15704759627,
	height: 1,
	impulse: 0,
	intellect: 0,
	strength: 0,
	stamina: 0,
	agility: 0,
	vigor: 0,
	fat: 0,
	lowerBodyMuscle: 0,
	upperBodyMuscle: 0,
	superDurability: 0,
	superMuscle: 0,
	superStrength: 0,
	superSpeed: 0,
	superStamina: 0,
	superSwingSpeed: 0,
	firstName: "",
	customClan: "",
	mode: "None",
	style: "Base",
	stance: "Default",
	title: "",
	clan: "None",
	trait: "Focused",
	gender: "Male",
	auraColor: new Color3(0, 0, 0),
	eyeColor: new Color3(0, 0, 0),
	hairColor: new Color3(0, 0, 0),
	glowingEyes: false,
	inCombat: false,
	enableTitle: false,
	authorities: [],
	modes: [],
	skills: [],
};

export const INITIAL_DATA: PlayerData = {
	bank: 0,
	purchaseHistory: [],
	agility: 0,
	auraColor: new Color3(1, 1, 1),
	authorities: [],
	marking: 0,
	mouth: 0,
	eyes: 0,
	nose: 0,
	groupId: 0,
	fatigue: 0,
	height: 1,
	heightboost: 0,
	styleExp: 0,
	hunger: 100,
	impulse: 0,
	intellect: 0,
	strength: 0,
	stamina: 0,
	jailTime: 0,
	vigor: 0,
	fat: 0,
	lowerBodyMuscle: 0,
	upperBodyMuscle: 0,
	superDurability: 0,
	superMuscle: 0,
	superStrength: 0,
	superSpeed: 0,
	superStamina: 0,
	superSwingSpeed: 0,
	userId: 0,
	noobProtection: 259200,
	money: 0,
	playtime: 0,
	firstName: "FirstName",
	enableTitle: false,
	clan: "None",
	trait: "Focused",
	shirt: 3547370873,
	pants: 3539061127,
	customClan: "None",
	mode: "None",
	style: "Base",
	stance: "Default",
	title: "",
	gender: "Male",
	eyeColor: new Color3(0, 0, 0),
	hairColor: new Color3(0, 0, 0),
	firstTimeSpawned: false,
	glowingEyes: false,
	reinholdBoost: false,
	inCombat: false,
	inCriminal: false,
	serverInit: false,
	gameInit: false,
	modes: [],
	skills: [],
	inventory: [],
};
