import { Service } from "@flamework/core";
import { AnimationService } from "./animation";
import { AnimationTrackNames } from "shared/structs/animation";
import { stringHas } from "shared/utility/strings";
import { getRandomArrayValue } from "shared/utility/object";
import { HitData } from "shared/structs/attack";

@Service()
export class DamageUtilService {
	constructor(private readonly animation: AnimationService) {}
	public get_clash_anim(character: CharacterModel): Maybe<AnimationTrackNames> {
		const names = this.animation.getTrackNames(character);
		if (!names) return;
		const filtered = names.filter((name) => stringHas(name, "clash", 1));
		return getRandomArrayValue(filtered);
	}

	public get_flinch_anim(character: CharacterModel): Maybe<AnimationTrackNames> {
		const names = this.animation.getTrackNames(character);
		if (!names) return;
		const filtered = names.filter((name) => stringHas(name, "flinch", 1));
		return getRandomArrayValue(filtered);
	}

	public get_special_block_anim(character: CharacterModel, context: HitData): Maybe<AnimationTrackNames> {
		const names = this.animation.getTrackNames(character);
		if (!names) return;
		const filtered = names.filter(
			(name) => stringHas(name, context.attacker.data.style) && stringHas(name, "blockreact"),
		);
		return filtered.size() > 0 ? getRandomArrayValue(filtered) : this.get_block_anim(character);
	}

	public get_blockBreak_anim(character: CharacterModel): Maybe<AnimationTrackNames> {
		const names = this.animation.getTrackNames(character);
		if (!names) return;
		const filtered = names.filter((name) => stringHas(name, "blockbroken", 1));
		return getRandomArrayValue(filtered);
	}

	public get_block_anim(character: CharacterModel): Maybe<AnimationTrackNames> {
		const names = this.animation.getTrackNames(character);
		if (!names) return;
		const filtered = names.filter((name) => stringHas(name, "blockreact", 1));
		return getRandomArrayValue(filtered);
	}

	public get_knockback_anim(character: CharacterModel): Maybe<AnimationTrackNames> {
		const names = this.animation.getTrackNames(character);
		if (!names) return;
		const filtered = names.filter((name) => stringHas(name, "knockback", 1));
		return getRandomArrayValue(filtered);
	}
}
