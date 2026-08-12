import type { TrackComponent } from "shared/components/track";
import type {
	combatAnimationLiterals,
	movementAnimationLiterals,
	styleAnimationLiterals,
	styleClientSafeLiterals,
} from "shared/enums/animation-enum";

export type MovementAnimations = {
	[key in (typeof movementAnimationLiterals)[number]]: Animation;
};

export type CombatAnimations = {
	[key in (typeof combatAnimationLiterals)[number]]: Animation;
};

export type StyleAnimations = {
	[key in (typeof styleAnimationLiterals)[number]]: Animation;
};
export type ClientSafeStyleAnimations = {
	[key in (typeof styleClientSafeLiterals)[number]]: Animation;
};
export type AnimationTrackNames = keyof NormalAnimations;
export type AnimationPropertyOverridesEnum = Partial<Record<AnimationTrackNames, Partial<AnimationPropertyOverrides>>>;
export type AnimationTrackRecord = Record<AnimationTrackNames, AnimationTrack>;
export type AnimationTrackComponentRecord = Record<AnimationTrackNames, TrackComponent>;
export interface PacketSafePlayAnimationOptions {
	offsets?: AnimationOffsets;
	stopOthers?: boolean;
	play?: boolean;
	character: CharacterModel;
}
export interface NormalAnimations extends MovementAnimations, CombatAnimations, ClientSafeStyleAnimations {}
export interface AnimationPropertyOverrides {
	speed: number;
	loop: boolean;
	weight: number;
	grade: number;
	priority: Enum.AnimationPriority;
	acceptsSigmoid: boolean;
	autoStoppable: boolean;
	fade: number;
	lerpFade: number;
}
export interface AnimationOffsets {
	speed?: number;
	fade?: number;
}
export interface NeededAnimations {
	idle: Animation;
	walk: Animation;
}
