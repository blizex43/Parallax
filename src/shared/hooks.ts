import type { AnimationTrackComponentRecord } from "./structs/animation";

export interface LogStart {}

export interface OnCharacterLoaded extends OnCharacterAdd {}

export interface OnCharacterAdd<Character extends CharacterModel = CharacterModel> {
	onCharacterAdd(character: Character): void;
}


export interface OnCharacterRemove<Character extends CharacterModel = CharacterModel> {
	onCharacterRemove(character: Character): void;
}

export interface OnCharacterAnimationsRegistered<Character extends CharacterModel = CharacterModel> {
	onCharacterAnimationsRegistered(character: Character, tracks: AnimationTrackComponentRecord): void;
}

export interface OnCharacterAnimationsDeregistered<Character extends CharacterModel = CharacterModel> {
	onCharacterAnimationsDeregistered(character: Character): void;
}
