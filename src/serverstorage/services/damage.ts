import { Service } from "@flamework/core";
import { DamageRecieved } from "shared/constants";
import { OnSignalSubscribed } from "shared/decorators";
import type { HitData } from "shared/structs/attack";
import type { DataService } from "./third-party/data";
import type { GUIDService } from "./guid";
import { Players } from "@rbxts/services";
import type { DamageTree } from "shared/structs/damage";
import { CombatState, MiscState, VitalityState } from "shared/enums/config-enum";
import type { WebsocketManagementService } from "./websocket-manager";
import type { DamageCalculateService } from "./damage-calculate";
import type { DamageSendService } from "./damage-send";
import type { DamageBoolService } from "./damage-bool";
import type { DamageNotifyService } from "./damage-notify";

@Service()
export class DamageService {
	public constructor(
		private readonly database: DataService,
		private readonly guid: GUIDService,
		private readonly sender: DamageSendService,
		private readonly bool: DamageBoolService,
		private readonly notify: DamageNotifyService,
		private readonly wsm: WebsocketManagementService,
		private readonly calculate: DamageCalculateService,
	) {}
	@OnSignalSubscribed(DamageRecieved)
	public async query(context: HitData): Promise<void> {
		//// Prerequisites
		if (!this.determine(context)) return;
		//// GET
		const attackedPlayer = Players.GetPlayerFromCharacter(context.attacked.character);
		const attackedData = attackedPlayer
			? this.database.get(attackedPlayer)
			: this.database.getPsuedo(this.guid.get(context.attacked.character));
		const tree = <DamageTree>{
			damage: this.calculate.calculate_damage(context, attackedData),
			stun: this.calculate.calculate_stun(context, attackedData),
			ailments: this.calculate.calculate_ailments(context),
			blocked: this.bool.bool_block(context),
			clashed: this.bool.bool_clash(context),
			iframed: this.wsm.getStateValue(context.attacked.character, VitalityState.Iframes),
		};
		//// GET, SEND & CALC
		if (tree.blocked) tree.blockBroken = this.bool.bool_blockBreak(context);
		if (tree.clashed) this.sender.async_send_clash(context);
		this.sender.send_cframe(context, tree);
		if (context.properties.knockback) tree.knockback = this.calculate.calculate_knockback(context);
		if (context.properties.flinchName) tree.flinchName = context.properties.flinchName;

		tree.flinchName ??= this.calculate.calculate_flinch(context, tree);
		//// SEND
		this.sender.send_animation(context, tree);
		tree.healthOutput = this.sender.send_damage(context, tree);
		this.sender.send_cancel(context, tree);
		this.sender.send_sound();
		this.sender.send_effect(context, tree);
		this.sender.send_stun(context, tree);
		this.sender.send_knockback(context, tree);
		this.sender.send_ragdoll(context, tree);
		this.sender.send_ailment(context, tree);
		this.sender.send_combat_tag(context, tree);
		//// NOTIFY
		this.notify.notify_damage(context, tree);
	}

	public determine(context: HitData): boolean {
		const attackerManager = this.wsm.getManager(context.attacker.character);
		if (!attackerManager) return false;
		if (
			this.wsm.getStateValue(context.attacked.character, CombatState.Knocked) ||
			(this.wsm.getStateValue(context.attacked.character, CombatState.Ragdoll) &&
				!this.bool.bool_ailment(this.calculate.calculate_ailments(context), "RagdollQuery")) ||
			!attackerManager.isAllValue(
				[
					CombatState.Stunned,
					CombatState.FullStunned,
					CombatState.BlockBroken,
					CombatState.Ragdoll,
					MiscState.Cutscene,
				],
				false,
			)
		)
			return false;
		return true;
	}
}
