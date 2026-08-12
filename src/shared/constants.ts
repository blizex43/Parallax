import { RunService as Runtime } from "@rbxts/services";
import Object from "@rbxts/object-utils";
import Signal from "@rbxts/signal";
import { atom } from "@rbxts/charm";
import {
	AIBlackboardKey,
	CameraState,
	CombatState,
	MiscState,
	MovementState,
	VitalityState,
} from "./enums/config-enum";
import type { Cameras } from "client/controllers/camera";
import type { RollOptions, RollType } from "./structs/info";
import type { PlayerData } from "./data-models/player-data";
import { DependerAtom, type CooldownAtom } from "./structs/atom";
import type { NPCType } from "./structs/npc";
import type { HitData, PostableWindowData } from "./structs/attack";
import { TrackComponent } from "./components/track";
enum DevID {
	Bliz = 99574819,
	vivxer = 4219808982,
}
export const DEVELOPERS = new Set(Object.values(DevID)); // add extra developer user IDs here
export function isDeveloper(player: Player): boolean {
	return Runtime.IsStudio() || DEVELOPERS.has(player.UserId);
}
export function createFlameworkCharms() {
	return {
		[CombatState.Block]: atom(false),
		[CombatState.BlockBroken]: atom(false),
		[CombatState.MouseOne]: atom(false),
		[CombatState.MouseTwo]: atom(false),
		[CombatState.CombatEquip]: atom(false),
		[CombatState.Endlag]: atom(false),
		[CombatState.Windup]: atom(false),
		[CombatState.AttackExecutable]: atom(true),
		[CombatState.Attacking]: atom(false),
		[CombatState.Stunned]: atom(false),
		[CombatState.Knocked]: atom(false),
		[CombatState.Ragdoll]: atom(false),
		[CombatState.Exhausted]: atom(false),
		[CombatState.FullStunned]: atom(false),
		[CombatState.Recovery]: atom(false),
		[CombatState.CombatTag]: atom(false),
		[CombatState.StopHealthRegen]: atom(false),
		[CombatState.NoRotate]: atom(false),
		[CombatState.Cooldowns]: atom<CooldownAtom>(new Map()),
		[CombatState.CombatTagAccumulator]: atom<DependerAtom>(new Map()),
		[VitalityState.Health]: atom(100),
		[VitalityState.Stamina]: atom(100),
		[VitalityState.Iframes]: atom(false),
		[MovementState.NoMove]: atom(false),
		[MovementState.Dash]: atom(false),
		[MovementState.Shiftlocked]: atom(false),
		[MovementState.Sprint]: atom(false),
		[MovementState.Jump]: atom(false),
		[MovementState.NoTrip]: atom(false),
		[MovementState.DashHorizontal]: atom(false),
		[MovementState.DashVertical]: atom(false),
		[CameraState.Clashing]: atom(false),
		[CameraState.Screenshake]: atom(false),
		[CameraState.FieldOfViewManipulate]: atom(false),
		[MiscState.Debug]: atom(false),
		[MiscState.Effect]: atom(false),
		[MiscState.Cutscene]: atom(false),
		[AIBlackboardKey.Aggression]: atom(false),
		[AIBlackboardKey.IsStunned]: atom(false),
		[AIBlackboardKey.IsInvincible]: atom(false),
		[AIBlackboardKey.ChaseTarget]: atom(false),
		[AIBlackboardKey.BlockDefensively]: atom(false),
		[AIBlackboardKey.TakeDamageOnly]: atom(false),
		[AIBlackboardKey.CombatRange]: atom(0),
		[AIBlackboardKey.AttackCooldown]: atom(999),
		[AIBlackboardKey.PatrolRadius]: atom(20),
		[AIBlackboardKey.DetectionRange]: atom(15),
		[AIBlackboardKey.RetreatThreshold]: atom(0),
		[AIBlackboardKey.MovementSpeed]: atom(0.7),
		[AIBlackboardKey.StrafeDistance]: atom(0),
		[AIBlackboardKey.TargetPriority]: atom(3),
		[AIBlackboardKey.PreferredRange]: atom(0),
	};
}
export const FlameworkIgnited = new Signal();
export const FlameworkCharms = createFlameworkCharms();
export const CameraChanged: Signal<(cam: keyof Cameras) => void> = new Signal();
export const CameraTargetChanged: Signal<(vector: Vector3) => void> = new Signal();
export const WalkspeedChanged: Signal = new Signal();
export const EffectFired: Signal<(effect: string) => void> = new Signal();
export const RerollSignal: Signal<(playerData: PlayerData, type: RollType, options: RollOptions) => void> =
	new Signal();
export const DamageRecieved: Signal<(data: HitData) => Promise<void>> = new Signal();
export const Rerolled: Signal = new Signal();
export const MarkForRemoval: Signal<(character: CharacterModel) => void> = new Signal();
export const NestDescendantChanged: Signal<(child: Instance, nest: Folder, added: boolean) => void> = new Signal();
export const NPCAdded: Signal<(npc: NPCType) => void> = new Signal();
export const NPCRemoving: Signal<(npc: NPCType) => void> = new Signal();
export const PostWindowData: Signal<(character: CharacterModel, data: PostableWindowData) => void> = new Signal();
export const OnKeyframeStepped: Signal<(component: TrackComponent, keyframe: string) => void> = new Signal();
