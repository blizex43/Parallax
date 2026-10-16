import type { BaseEffect } from "@rbxts/refx";
import type { EffectTable } from "shared/enums/effect-enum";
import type { CharacterLimbsType } from "./model";
import type { AttachmentNameType } from "./attachment";
export type EffectName = (typeof EffectTable)[number];
export type EffectReferenceType = BasePart | Attachment;
export type EffectPositionType = "Floor" | "Custom" | CharacterLimbsType;
export type EffectEmissionType = "Emit" | "Enable" | "All";
export interface PacketSafeEffectOptions {
	players: Player[];
	character: CharacterModel;
	timeout?: number;
	duration?: number;
	radius?: number;
	alternate?: boolean;
	debug?: boolean;
	deactivate?: boolean;
	delay?: number;
	more?: {
		cframe?: CFrame;
		position?: Vector3;
		size?: Vector3;
		limb?: CharacterLimbsType[];
		direction?: Vector3;
		timeout?: number;
	};
}
export interface EffectInfo {
	lastUsed: number;
}
export interface VFXMetadata {
	lastEffectUsed: Maybe<EffectName>;
	effectData: Map<EffectName, EffectInfo>;
}

export interface StandardEffect extends BaseEffect {
	onRemote?(options: PacketSafeEffectOptions): void;
	IsDestroyedAtom?: () => boolean;
}

export interface EffectModule {
	new (options: PacketSafeEffectOptions, name?: EffectName): StandardEffect;
}

export interface EffectSpec {
	reference: EffectReferenceType; //// VFX Parent
	emissionType: EffectEmissionType;
	scaleWithHeight?: boolean;
	position?: EffectPositionType; //// VFX Spawn Location
	positions?: EffectPositionType[]; //// VFX Spawn Locations
	subPosition?: AttachmentNameType;
	attach?: AttachmentNameType;
	power?: number; //// Raycast Spawn Power
	size?: number;
	isForged?: boolean; // Is Made From VFX-Forge
	weld?: boolean;
	parentToEffectFolder?: boolean;
	offset?: Vector3;
	emissions?: number; //// Particle Count
	variants?: string[];
}

export interface SoundSpec {
	reference: Instance; //// SFX Parent
	variants?: string[];
}

export interface EffectContext {
	particleReference: EffectSpec;
	soundReference?: SoundSpec;
	handler?: "footstep";
	keyframes?: EffectKeyframe[];
}

export interface EffectKeyframe {
	at: number;
	effect: EffectName;
	options?: Partial<PacketSafeEffectOptions>;
}
