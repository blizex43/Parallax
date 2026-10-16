import type { ActionJournal, StateManager } from "@rbxts/action-journal";
import type {
	Title,
	CameraState,
	CombatState,
	MiscState,
	MovementState,
	VitalityState,
	NPCResourcesState,
} from "shared/enums/config-enum";
import type { CooldownAtom, CooldownEntry, DependerAtom, DependerEntry } from "./atom";
import type { Default } from "@rbxts/default";
import type { JournalUtil } from "shared/classes/journal-util";
export type JournalHandlerMethodsArray = JournalHandlerMethods[];
export type JournalHandlerBehavior =
	| "Run If All True"
	| "Run If All False"
	| "Run If Single True"
	| "Run If Single False";
export type JournalHandlerHandleType = "blacklist" | "whitelist" | "override" | "overrideEnd" | "revert";
export interface GameState {
	[Title.Player]: {
		[Title.Combat]: {
			[CombatState.Block]: boolean;
			[CombatState.BlockBroken]: boolean;
			[CombatState.MouseOne]: boolean;
			[CombatState.MouseTwo]: boolean;
			[CombatState.CombatEquip]: boolean;
			[CombatState.Endlag]: boolean;
			[CombatState.Windup]: boolean;
			[CombatState.AttackExecutable]: Default<boolean, true>;
			[CombatState.Attacking]: boolean;
			[CombatState.Stunned]: boolean;
			[CombatState.Knocked]: boolean;
			[CombatState.Ragdoll]: boolean;
			[CombatState.Exhausted]: boolean;
			[CombatState.FullStunned]: boolean;
			[CombatState.Recovery]: boolean;
			[CombatState.CombatTag]: boolean;
			[CombatState.StopHealthRegen]: boolean;
			[CombatState.NoRotate]: boolean;
			[CombatState.Cooldowns]: Default<CooldownAtom, Record<string, CooldownEntry>>;
			[CombatState.CombatTagAccumulator]: Default<DependerAtom, Record<string, DependerEntry>>;
		};
		[Title.Health]: {
			[VitalityState.Health]: number;
			[VitalityState.Stamina]: number;
			[VitalityState.Iframes]: boolean;
		};
		[Title.Movement]: {
			[MovementState.NoMove]: boolean;
			[MovementState.Dash]: boolean;
			[MovementState.Shiftlocked]: boolean;
			[MovementState.Sprint]: boolean;
			[MovementState.Jump]: boolean;
			[MovementState.NoTrip]: boolean;
			[MovementState.DashHorizontal]: boolean;
			[MovementState.DashVertical]: boolean;
		};
		[Title.Camera]: {
			[CameraState.Clashing]: boolean;
			[CameraState.Screenshake]: boolean;
			[CameraState.FieldOfViewManipulate]: boolean;
		};
	};
	[Title.AI]: {
		[NPCResourcesState.AggressiveWeight]: number;
		[NPCResourcesState.BlockWeight]: number;
		[NPCResourcesState.DetectRange]: number;
		[NPCResourcesState.PassiveWeight]: number;
	};
	[Title.Other]: {
		[MiscState.Debug]: boolean;
		[MiscState.Effect]: boolean;
		[MiscState.Cutscene]: boolean;
	};
}

export interface EntityStateCache<G extends GameState = GameState> {
	state: StateManager<G>;
	actions: ActionJournal<G>;
	connections: RBXScriptConnection[];
	util: JournalUtil<EntityStateCache["state"]>;
}

export interface JournalInfoMeta {
	lastWritten: number;
}

export interface JournalSignalType<T> {
	newValue: T;
	oldValue: T;
	author: string;
	path: string;
}

export interface JournalHandlerMethods {
	handleType: JournalHandlerHandleType;
	paths: string[];
	behavior: JournalHandlerBehavior;
	revertValue?: unknown;
}
