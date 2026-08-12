/* eslint-disable @typescript-eslint/no-empty-object-type */
import type {
	AnimationTrackNames,
	ClientSafeStyleAnimations,
	CombatAnimations,
	MovementAnimations,
	PacketSafePlayAnimationOptions,
} from "./animation";
import type { AttackLiterals } from "./attack";
import type { PacketSafePlaySoundOptions } from "./audio";
import type { EffectName, PacketSafeEffectOptions } from "./effect";
import type { MetaType } from "./meta";
import type { PushDirection } from "./push";

export interface AudioPacket {
	readonly sound: Sound;
	readonly options?: PacketSafePlaySoundOptions;
}

export interface TogglePacket {
	on: boolean;
}

export interface AnimationReplicatorPacket {
	readonly name: AnimationTrackNames;
	readonly options: PacketSafePlayAnimationOptions;
}
export interface BlockPacket extends TogglePacket {}
export interface SprintPacket extends TogglePacket {}
export interface DashPacket extends TogglePacket {}
export interface AnimationPacket {
	combat: CombatAnimations;
	movement: MovementAnimations;
	style: ClientSafeStyleAnimations;
}

export interface AnimationPacketResolved {
	combat: Record<keyof CombatAnimations, string>;
	movement: Record<keyof MovementAnimations, string>;
	style: Record<keyof ClientSafeStyleAnimations, string>;
}
export interface PushPacket {
	duration?: number;
	direction?: PushDirection;
	unturnable?: boolean;
	power?: number;
	vector?: Vector3;
	useVector?: boolean;
}
export interface EffectPacket {
	readonly name: EffectName;
	readonly options: PacketSafeEffectOptions;
}
export interface AttackPacket extends MetaType {
	readonly name: AttackLiterals;
	readonly options?: object;
}
export interface AssetPacket extends AnimationPacketResolved {}
