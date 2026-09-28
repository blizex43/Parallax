import { Service } from "@flamework/core";
import type { AilmentsLiterals, AilmentSpec, HitData } from "shared/structs/attack";
import { distance, isBackTurned } from "shared/utility/vector";
import type { JournalService } from "./journal";
import { CombatState } from "shared/enums/config-enum";
import { backTurnedThreshhold } from "shared/enums/damage-enum";
import { ClashProperties } from "shared/enums/clash-enum";
import type { AttackHeaderService } from "./attack-header";
import type { BlockService } from "./block";
import type { ClashService } from "./clash";

@Service()
export class DamageBoolService {
	constructor(
		private readonly journal: JournalService,
		private readonly header: AttackHeaderService,
		private readonly block: BlockService,
		private readonly clash: ClashService,
	) { }
	public bool_clash(context: HitData): boolean {
		if (!context.properties.clash) return false;
		const attackedHeaderData = this.header.getRunningMeta(context.attacked.character);
		if (
			!attackedHeaderData.attacking ||
			!attackedHeaderData.postData ||
			!attackedHeaderData.postData.window.onHit.clash ||
			isBackTurned(
				context.attacker.character.HumanoidRootPart,
				context.attacked.character.HumanoidRootPart,
				ClashProperties.BackThreshhold,
			) ||
			distance(
				context.attacker.character.HumanoidRootPart.Position,
				context.attacked.character.HumanoidRootPart.Position,
			) > 14 ||
			this.clash.isOnCooldown(context.attacked.character, context.attacker.character)
		)
			return false;
		return true;
	}

	public bool_ailment(ailments: AilmentSpec[], ailment: AilmentsLiterals): boolean {
		return ailments.some((ailmentMap) => ailmentMap.ailment === ailment);
	}

	public bool_block(context: HitData): boolean {
		return (
			(this.journal.fetchStateValue<boolean>(context.attacked.character, CombatState.Block) ?? false) &&
			this.block.canBlock(context.attacked.character) &&
			!isBackTurned(
				context.attacker.character.HumanoidRootPart,
				context.attacked.character.HumanoidRootPart,
				backTurnedThreshhold,
			)
		);
	}

	public bool_blockBreak(context: HitData): boolean {
		return context.properties.breaker ? true : false;
	}
}
