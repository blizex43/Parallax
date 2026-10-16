import { Controller } from "@flamework/core";
import { atom } from "@rbxts/charm";
import type { AnimationPacket, AssetPacket } from "shared/structs/packets";
import type { OnAssetLoad } from "client/hooks";
import Signal from "@rbxts/signal";
import type { OnCharacterLoaded, OnCharacterRemove } from "shared/hooks";
import type { RuntimeAnimationTrackRecord, RuntimeStyleAnimations } from "shared/structs/animation";
import type { CombatAnimations, MovementAnimations } from "shared/structs/animation";
import Object from "@rbxts/object-utils";
import { TrackHandler } from "shared/classes/tracks";
import { promisifyEvent } from "shared/utility/promises";
import { Create } from "shared/utility/instance";
import { Player } from "client/utility";
import { isString } from "shared/utility/t-isA";
@Controller()
export class AnimationController extends TrackHandler implements OnAssetLoad, OnCharacterLoaded, OnCharacterRemove {
	public readonly animations = <AnimationPacket>{};
	public readonly recieved = atom(false);
	public readonly recievedSignal = <Signal<(animations: typeof this.animations) => void>>new Signal();
	private selectedStyle = "base";
	private selectedStance = "default";
	private readonly pendingCharacters = new Map<CharacterModel, Promise<void>>();
	async onCharacterAdd(character: CharacterModel): Promise<void> {
		if (this.isRegistered(character)) return;
		const pending = this.pendingCharacters.get(character);
		if (pending) return pending;
		const registration = this.initializeCharacter(character)
			.then((tracks) => super.registerCharacter(character, tracks))
			.then(() => {
				this.pendingCharacters.delete(character);
			});
		this.pendingCharacters.set(character, registration);
		return registration;
	}
	async onCharacterRemove(character: CharacterModel): Promise<void> {
		await super.deregisterCharacter(character);
	}

	public async ensureTrack(character: CharacterModel, name: string): Promise<boolean> {
		if (!this.isRegistered(character)) await this.onCharacterAdd(character);
		if (this.getTrackByName(character, name)) return true;

		const animation = this.animations.style[name];
		if (!animation) return false;
		const tracks = <RuntimeAnimationTrackRecord>{};
		tracks[name] = character.Humanoid.Animator.LoadAnimation(animation);
		for (const [attribute, value] of animation.GetAttributes()) tracks[name].SetAttribute(attribute, value);
		await super.registerCharacter(character, tracks);
		return true;
	}

	public async getAnimationTable(force: boolean): Promise<Maybe<AnimationPacket>> {
		if (this.recieved()) return this.animations;
		if (force) return await this.forceGetAnimationTable();
		return;
	}

	public onAssetLoad(data: AssetPacket): void {
		this.setAnimations(data);
	}

	public async forceGetAnimationTable(): Promise<AnimationPacket> {
		const empty = Object.values(this.animations).isEmpty();
		const [animTable] = !empty ? [this.animations] : await promisifyEvent(this.recievedSignal);
		return animTable;
	}

	private assetIdToAnimation(data: AssetPacket, force = true): AnimationPacket {
		return {
			combat: <CombatAnimations>this.animationIdsToObjects(data.combat, this.animations.combat, force),
			movement: <MovementAnimations>this.animationIdsToObjects(data.movement, this.animations.movement, force),
			style: this.animationIdsToObjects(data.style, this.animations.style, force),
		};
	}

	private animationIdsToObjects(
		ids: Record<string, string>,
		existing: Maybe<Record<string, Animation>>,
		force: boolean,
	): Record<string, Animation> {
		const animations: Record<string, Animation> = {};
		for (const [name, animId] of pairs(ids)) {
			const host = existing?.[name];
			if (!force && host && host.AnimationId === animId) {
				animations[name] = host;
				continue;
			}
			animations[name] = Create("Animation", "Animation", undefined, (instance) => {
				instance.AnimationId = animId;
			});
		}
		return animations;
	}

	private async initializeCharacter(character: CharacterModel): Promise<RuntimeAnimationTrackRecord> {
		return this.transformAnimationsToTracks(character, (await this.getAnimationTable(true))!);
	}

	private transformAnimationsToTracks(
		character: CharacterModel,
		anims: AnimationPacket,
	): RuntimeAnimationTrackRecord {
		const animator = character.Humanoid.Animator;
		const animationTracks = <RuntimeAnimationTrackRecord>{};
		for (const [name, anim] of pairs(anims.combat)) this.loadTrack(animationTracks, animator, name, anim);
		for (const [name, anim] of pairs(anims.movement)) this.loadTrack(animationTracks, animator, name, anim);
		const [style, stance] = this.getStyleSelection(character);
		const selectedPrefix = `${style.lower()}:${stance.lower()}:`;
		for (const [name, anim] of pairs(<RuntimeStyleAnimations>anims.style)) {
			const isSelectedAlias = character === Player.Character && name.sub(1, 6) === "style_";
			if (isSelectedAlias || name.sub(1, selectedPrefix.size()) === selectedPrefix)
				this.loadTrack(animationTracks, animator, name, anim);
		}
		return animationTracks;
	}

	private loadTrack(
		tracks: RuntimeAnimationTrackRecord,
		animator: Animator,
		name: string,
		animation: Animation,
	): void {
		if (animation.Name !== name) animation.Name = name;
		tracks[name] = animator.LoadAnimation(animation);
		for (const [attribute, value] of animation.GetAttributes()) tracks[name].SetAttribute(attribute, value);
	}

	private getStyleSelection(character: CharacterModel): [string, string] {
		const style = character.GetAttribute("Style");
		const stance = character.GetAttribute("Stance");
		return [isString(style) ? style : this.selectedStyle, isString(stance) ? stance : this.selectedStance];
	}

	private async setAnimations(data: AssetPacket): Promise<void> {
		this.selectedStyle = data.selectedStyle.lower();
		this.selectedStance = data.selectedStance.lower();
		(<Writable<AnimationController>>this).animations = this.assetIdToAnimation(data);
		if (!this.recieved()) this.recieved(true);
		else {
			const character = <CharacterModel>Player.Character;
			if (character)
				await super.registerCharacter(character, this.transformAnimationsToTracks(character, this.animations));
		}
		this.recievedSignal.Fire(this.animations);
	}
}
