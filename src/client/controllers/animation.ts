import { Controller } from "@flamework/core";
import { atom } from "@rbxts/charm";
import type { AnimationPacket, AssetPacket } from "shared/structs/packets";
import type { OnAssetLoad } from "client/hooks";
import Signal from "@rbxts/signal";
import type { OnCharacterLoaded, OnCharacterRemove } from "shared/hooks";
import type { AnimationTrackNames, AnimationTrackRecord, NormalAnimations } from "shared/structs/animation";
import Object from "@rbxts/object-utils";
import { TrackHandler } from "shared/classes/tracks";
import { promisifyEvent } from "shared/utility/promises";
import { Create } from "shared/utility/instance";
import { Player } from "client/utility";
@Controller()
export class AnimationController extends TrackHandler implements OnAssetLoad, OnCharacterLoaded, OnCharacterRemove {
	public readonly animations = <AnimationPacket>{};
	public readonly recieved = atom(false);
	public readonly recievedSignal = <Signal<(animations: typeof this.animations) => void>>new Signal();
	async onCharacterAdd(character: CharacterModel): Promise<void> {
		const tracks = await this.initializeCharacter(character);
		await super.registerCharacter(character, tracks);
	}
	async onCharacterRemove(character: CharacterModel): Promise<void> {
		await super.deregisterCharacter(character);
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
		const animations = <AnimationPacket>{};

		for (const [name, values] of pairs(data)) {
			const result = (animations[name] ??= <never>{});
			const hostRecord = this.animations[name];

			for (const [animName, animId] of pairs(<Record<AnimationTrackNames & "idle", string>>values)) {
				if (!force && hostRecord && animName in hostRecord && hostRecord[animName].AnimationId === animId)
					continue;
				result[animName] = Create("Animation", "Animation", undefined, (instance) => {
					instance.AnimationId = animId;
				});
			}
		}

		return animations;
	}

	private async initializeCharacter(character: CharacterModel): Promise<AnimationTrackRecord> {
		return this.transformAnimationsToTracks(character.Humanoid.Animator, (await this.getAnimationTable(true))!);
	}

	private transformAnimationsToTracks(animator: Animator, anims: AnimationPacket): AnimationTrackRecord {
		const animationTracks = <AnimationTrackRecord>{};
		for (const obj of Object.values(anims))
			for (const [name, anim] of pairs(<NormalAnimations>obj)) {
				if (anim.Name !== name) anim.Name = name;
				animationTracks[name] = animator.LoadAnimation(anim);
				for (const [attribute, value] of anim.GetAttributes())
					animationTracks[name].SetAttribute(attribute, value);
			}
		return animationTracks;
	}

	private async setAnimations(data: AssetPacket): Promise<void> {
		(<Writable<AnimationController>>this).animations = this.assetIdToAnimation(data);
		if (!this.recieved()) this.recieved(true);
		else {
			const character = <CharacterModel>Player.Character;
			if (character)
				await super.registerCharacter(
					character,
					this.transformAnimationsToTracks(character.Humanoid.Animator, this.animations),
				);
		}
		this.recievedSignal.Fire(this.animations);
	}
}
