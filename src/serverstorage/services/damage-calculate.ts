import { Service } from "@flamework/core";
import type { PsuedoPlayerData } from "shared/data-models/player-data";
import { baseCombatTagDuration } from "shared/enums/damage-enum";
import type { AilmentSpec, HitData } from "shared/structs/attack";
import type { DamageTree } from "shared/structs/damage";
import { DamageUtilService } from "./damage-util";
import { AnimationTrackNames } from "shared/structs/animation";
import type { AnomalyService } from "./anomaly";

@Service()
export class DamageCalculateService {
	constructor(
		private readonly util: DamageUtilService,
		private readonly anomaly: AnomalyService,
	) {}
	public calculate_damage(context: HitData, data: PsuedoPlayerData): number {
		return context.properties.damage * this.anomaly.getIncomingDamageMultiplier(context.attacked.character);
	}

	public calculate_stun(context: HitData, data: PsuedoPlayerData): number {
		return context.properties.stun.duration * this.anomaly.getOutgoingStunMultiplier(context.attacker.character);
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
		worldDir = new Vector3(worldDir.X, 0, worldDir.Z);

		if (worldDir.Magnitude < 3) {
			const look = attackerRoot.CFrame.LookVector;
			worldDir = new Vector3(look.X, 0, look.Z);
		}

		if (worldDir.Magnitude < 0.001) return;

		worldDir = worldDir.Unit;
		const localDir = attackedRoot.CFrame.VectorToObjectSpace(worldDir);
		return new Vector3(localDir.X, 0, localDir.Z).Unit;
	}

	public calculate_flinch(context: HitData, tree: DamageTree): Maybe<AnimationTrackNames> {
		return tree.clashed
			? undefined
			: tree.blockBroken
				? this.util.get_blockBreak_anim(context.attacked.character)
				: tree.blocked
					? this.util.get_block_anim(context.attacked.character)
					: context.properties.knockback?.type === "Super"
						? this.util.get_knockback_anim(context.attacked.character)
						: (this.util.get_flinch_anim(context.attacked.character) ?? "flinch1");
	}
}
