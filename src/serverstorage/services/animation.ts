import { Service } from "@flamework/core";
import type { OnCharacterAdd, OnCharacterRemove } from "shared/hooks";
import type { RuntimeAnimationTrackRecord } from "shared/structs/animation";
import { TrackHandler } from "shared/classes/tracks";
import { SpawnTask } from "shared/decorators";
import { AssetService } from "./asset";
import { isAssetId } from "shared/utility/strings";
import { isNull } from "shared/utility/t-isA";

@Service()
export class AnimationService extends TrackHandler implements OnCharacterAdd, OnCharacterRemove {
	constructor(private readonly asset: AssetService) {
		super();
	}
	@SpawnTask()
	public async onCharacterAdd(character: CharacterModel): Promise<void> {
		const tracks = await this.initializeCharacter(character);
		await this.registerCharacter(character, tracks);
	}
	public async onCharacterRemove(character: CharacterModel): Promise<void> {
		await this.deregisterCharacter(character);
	}

	private loadIfValid(animator: Animator, animation: Animation): Maybe<AnimationTrack> {
		const assetId = animation.AnimationId;
		if (!isAssetId(assetId) || isNull(assetId.match("%d+"))) return;
		const track = animator.LoadAnimation(animation);
		for (const [attribute, value] of animation.GetAttributes()) track.SetAttribute(attribute, value);
		return track;
	}

	private async initializeCharacter(character: CharacterModel): Promise<RuntimeAnimationTrackRecord> {
		const animator = character.Humanoid.Animator;
		const animationTracks = <RuntimeAnimationTrackRecord>{};
		for (const [style, stanceMap] of this.asset.styleAnimations) {
			const styleKey = tostring(style).lower();
			for (const [stance, stanceObject] of stanceMap) {
				const stanceKey = stance.lower();
				for (const [name, anim] of pairs(stanceObject)) {
					const trackKey = `${styleKey}:${stanceKey}:${name}`;
					const track = this.loadIfValid(animator, anim);
					if (track) animationTracks[trackKey] = track;
				}
			}
		}
		for (const [name, anim] of pairs(this.asset.combatAnimations)) {
			const track = this.loadIfValid(animator, anim);
			if (track) animationTracks[name] = track;
		}
		for (const [name, anim] of pairs(this.asset.movementAnimations)) {
			const track = this.loadIfValid(animator, anim);
			if (track) animationTracks[name] = track;
		}
		return animationTracks;
	}
}
