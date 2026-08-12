import { Service } from "@flamework/core";
import { Players } from "@rbxts/services";
import { ClashProperties } from "shared/enums/clash-enum";
import { CombatState, VitalityState } from "shared/enums/config-enum";
import type { AnimationTrackNames } from "shared/structs/animation";
import type { HitData } from "shared/structs/attack";
import type { DamageTree } from "shared/structs/damage";
import { getHeightDifferenceFromCharacters } from "shared/utility/basepart";
import type { AnimationReplicatorService } from "./animation-replicator";
import type { WebsocketManagementService } from "./websocket-manager";
import type { VFXService } from "./effect";
import type { GUIDService } from "./guid";
import type { DamageCalculateService } from "./damage-calculate";
import type { RagdollService } from "./ragdoll";
import { flatten, toWorldVector } from "shared/utility/vector";
import type { AttackHeaderService } from "./attack-header";
import { RegenProperties } from "shared/enums/regen-enum";
import Log from "shared/log";
import type { BlockService } from "./block";
import type { ClashService } from "./clash";
import type { TeleportService } from "./teleport";
import type { PushService } from "./push";
const { max } = math;
@Service()
export class DamageSendService {
	constructor(
		private readonly guid: GUIDService,
		private readonly replicator: AnimationReplicatorService,
		private readonly push: PushService,
		private readonly teleport: TeleportService,
		private readonly ragdoll: RagdollService,
		private readonly header: AttackHeaderService,
		private readonly ws: WebsocketManagementService,
		private readonly block: BlockService,
		private readonly effect: VFXService,
		private readonly clash: ClashService,
		private readonly calculate: DamageCalculateService,
	) { }
	public send_animation(
		context: HitData,
		tree: DamageTree,
		victim: CharacterModel = context.attacked.character,
		name: Maybe<AnimationTrackNames> = tree.flinchName,
		play: boolean = true,
		stopOthers: boolean = false,
	) {
		if (name && !tree.iframed) this.replicator.replicate(victim, name, play, stopOthers);
	}

	public send_ailment(context: HitData, tree: DamageTree) {
		if ((tree.blocked && !tree.blockBroken) || tree.iframed) return;
		const manipulator = this.ws;
		const character = context.attacked.character;
		for (const ailment of tree.ailments)
			switch (ailment.ailment) {
				case "Iframe":
					manipulator.setStateFor(character, VitalityState.Iframes, true, ailment.duration, false, true);
					break;
			}

		if (tree.blockBroken) {
			manipulator.setStateFor(
				character,
				CombatState.BlockBroken,
				true,
				context.properties.breaker?.duration ?? 1.5,
				false,
				true,
			);
		}
	}

	public send_effect(context: HitData, tree: DamageTree) {
		const { attacked, attacker } = context;
		const heightDiff = getHeightDifferenceFromCharacters(attacked.character, attacker.character);
		if (tree.blockBroken)
			this.effect.effectReplicate({
				name: "Guard-Break",
				options: {
					players: Players.GetPlayers(),
					character: attacked.character,
					radius: 110,
				},
			});
		if (tree.damaged && context.properties.hitEffects)
			for (const effect of context.properties.hitEffects)
				this.effect.effectReplicate({
					name: effect,
					options: {
						players: Players.GetPlayers(),
						character: attacked.character,
						radius: 110,
						more: {
							direction: tree.knockback,
						},
					},
				});
		if (tree.clashed) {
			this.effect.effectReplicate({
				name: "Clash",
				options: {
					players: Players.GetPlayers(),
					character: attacker.character,
					radius: ClashProperties.Radius,
					more: {
						direction: tree.knockback,
						position: attacker.character.HumanoidRootPart.Position.add(
							attacked.character.HumanoidRootPart.Position,
						)
							.div(2)
							.add(new Vector3(0, 1 + heightDiff, 0)),
					},
				},
			});
		}
	}

	public send_sound() { }

	public send_combat_tag(context: HitData, tree: DamageTree) {
		if ((tree.blocked && !tree.blockBroken) || tree.iframed) return;
		this.ws.addValueToTableState(
			context.attacked.character,
			CombatState.CombatTagAccumulator,
			this.guid.get(context.attacker.character),
			this.calculate.calculate_combat_tag(context),
			false,
		);
	}
	public send_ragdoll(context: HitData, tree: DamageTree) {
		if ((tree.blocked && !tree.blockBroken) || tree.iframed || tree.clashed) return;
		if (this.ragdoll.isRagdolled(context.attacked.character) && tree.knockback && context.properties.knockback)
			this.ragdoll.addVectorToRagdoll(
				context.attacked.character,
				toWorldVector(
					context.attacked.character.HumanoidRootPart.CFrame,
					tree.knockback.mul(context.properties.knockback.power * 10),
				),
			);
	}

	public send_stun(context: HitData, tree: DamageTree): void {
		if ((tree.blocked && !tree.blockBroken) || tree.iframed || tree.clashed) return;
		return this.ws.setStateFor(
			context.attacked.character,
			context.properties.stun.type === "Normal" ? CombatState.Stunned : CombatState.FullStunned,
			true,
			tree.stun,
			false,
			true,
		);
	}

	public send_cancel(context: HitData, tree: DamageTree): void {
		const { attacked } = context;
		if (!tree.iframed || tree.clashed) this.header.cancelHandler(attacked.character);
		if (!tree.blocked && this.block.getBlock(attacked.character)) this.block.handleBlock(attacked.character, false);
	}

	public send_damage(context: HitData, tree: DamageTree): number {
		const humanoid = context.attacked.character.Humanoid;
		if ((tree.blocked && tree.blocked && !tree.blockBroken) || tree.iframed || tree.clashed) return humanoid.Health;
		const health = max(RegenProperties.LowestHealthPossible, humanoid.Health - tree.damage);
		humanoid.Health = health;
		tree.damaged = true;
		Log.info(`damage: ${tree.damage}`);
		return humanoid.Health;
	}

	public send_knockback(context: HitData, tree: DamageTree): void {
		if (tree.blocked || tree.blockBroken || tree.iframed || tree.clashed) return;
		if (tree.knockback && context.properties.knockback && !this.ragdoll.isRagdolled(context.attacked.character)) {
			this.push.set(
				context.attacked.character,
				{
					vector: tree.knockback,
					duration: context.properties.knockback.duration,
					power: context.properties.knockback.power,
					unturnable: true,
					useVector: true,
				},
				true,
			);
		}
	}
	// Return False if clash is ignored so the damage passes
	// Return True if clash isn't ignored and played by clash service
	public async async_send_clash(context: HitData): Promise<boolean> {
		// print(`${context.attacker.character} has clashed with ${context.attacked.character}!`);
		return await this.clash.start(context);
	}

	public send_cframe(context: HitData, tree: DamageTree): void {
		if ((tree.blocked && !tree.blockBroken) || (tree.iframed && !tree.clashed)) return;
		const { attacker, attacked } = context;
		const attackedCharacter = attacked.character;
		const attackerCharacter = attacker.character;
		if (tree.clashed) {
			const heightDiff = getHeightDifferenceFromCharacters(attackedCharacter, attackerCharacter);
			const attackedLocator = this.teleport.getLocator(attackedCharacter);
			const attackerLocator = this.teleport.getLocator(attackerCharacter);
			const attackerRoot = attackerCharacter.HumanoidRootPart;
			const attackedRoot = attackedCharacter.HumanoidRootPart;
			const center = attackerRoot.Position.add(attackedRoot.Position)
				.div(2)
				.add(new Vector3(0, heightDiff, 0));
			const between = attackerRoot.Position.sub(attackedRoot.Position);
			const flatBetween = flatten(between).Unit;

			const distance = ClashProperties.Distance + heightDiff;

			const attackerPos = center.add(flatBetween.mul(distance));
			const attackedPos = center.sub(flatBetween.mul(distance));

			if (attackerLocator) {
				attackerLocator.teleport(attackerPos);
				attackerLocator.lookAt(attackedPos);
			}

			if (attackedLocator) {
				attackedLocator.teleport(attackedPos);
				attackedLocator.lookAt(attackerPos);
			}
		}
	}
}
