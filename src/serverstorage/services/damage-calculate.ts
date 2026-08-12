import { Service } from "@flamework/core";
import type { PsuedoPlayerData } from "shared/data-models/player-data";
import { baseCombatTagDuration } from "shared/enums/damage-enum";
import type { AilmentSpec, HitData } from "shared/structs/attack";
import type { DamageTree } from "shared/structs/damage";
import { flatten } from "shared/utility/vector";
import { DamageUtilService } from "./damage-util";
import { AnimationTrackNames } from "shared/structs/animation";

@Service()
export class DamageCalculateService {
	constructor(private readonly util: DamageUtilService) {}
	public calculate_damage(context: HitData, data: PsuedoPlayerData): number {
		const damage = context.properties.damage;
		return damage;
	}

	public calculate_stun(context: HitData, data: PsuedoPlayerData): number {
		return context.properties.stun.duration;
	}

	public calculate_ailments(context: HitData): AilmentSpec[] {
		return context.properties.ailments ?? [];
	}

	public calculate_combat_tag(context: HitData): number {
		//// Add Trait Buffers / NPC Buffers / Aptitude Buffers when needed
		return baseCombatTagDuration;
	}

	public calculate_knockback(context: HitData): Maybe<Vector3> {
		const attackerRoot = context.attacker.character.HumanoidRootPart;
		const attackedRoot = context.attacked.character.HumanoidRootPart;

		if (!attackerRoot || !attackedRoot) return;

		let worldDir = attackedRoot.Position.sub(attackerRoot.Position);

		worldDir = flatten(worldDir);

		if (worldDir.Magnitude < 3) {
			const look = attackerRoot.CFrame.LookVector;
			worldDir = flatten(look);
		}

		if (worldDir.Magnitude === 0) return;

		worldDir = worldDir.Unit;
		const localDir = attackedRoot.CFrame.VectorToObjectSpace(worldDir);

		return flatten(localDir);
	}

	public calculate_flinch(context: HitData, tree: DamageTree): Maybe<AnimationTrackNames> {
		return tree.clashed
			? undefined
			: tree.blockBroken
				? this.util.get_blockBreak_anim(context.attacked.character)
				: tree.blocked
					? this.util.get_block_anim(context.attacked.character)
					: context.properties.knockback?.type === "Super"
						? this.util.get_knockback_anim(context.attacked.character)!
						: (this.util.get_flinch_anim(context.attacked.character) ?? "flinch1");
	}
}
