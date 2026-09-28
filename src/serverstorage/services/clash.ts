import { Service } from "@flamework/core";
import type { HitData } from "shared/structs/attack";
import { CameraState, MiscState } from "shared/enums/config-enum";
import { ClashProperties } from "shared/enums/clash-enum";
import type { AnimationReplicatorService } from "./animation-replicator";
import type { PushService } from "./push";
import type { DamageUtilService } from "./damage-util";
import type { ScreenShakeService } from "./screen-shake";
import { ScreenShakePresets } from "shared/enums/screen-shake-enum";
import type { FieldOfViewService } from "./field-of-view";
import { FieldOfViewPresets } from "shared/enums/field-of-view-enum";
import { forLoopArrayExpression } from "shared/utility/loop";
import { SuperJanitor } from "shared/classes/super-janitor";
import { noop } from "shared/utility/functions";
import type { JournalService } from "./journal";
@Service()
export class ClashService {
	private recentClashes: CharacterModel[] = [];
	public constructor(
		private readonly journal: JournalService,
		private readonly replicator: AnimationReplicatorService,
		private readonly util: DamageUtilService,
		private readonly push: PushService,
		private readonly screenshake: ScreenShakeService,
		private readonly fieldofview: FieldOfViewService,
	) {}
	public async start(context: HitData): Promise<boolean> {
		const { attacker, attacked } = context;
		const attackedCharacter = attacked.character;
		const attackerCharacter = attacker.character;
		this.giveClashCooldown(attackedCharacter, attackerCharacter);
		const attackedClashAnim = this.util.get_clash_anim(attackedCharacter) ?? "clash1";
		const attackerClashAnim = this.util.get_clash_anim(attackerCharacter) ?? "clash1";

		this.journal
			.fetchUtil(attackedCharacter)
			?.writeFor(
				MiscState.Cutscene,
				true,
				ClashProperties.Duration + ClashProperties.KnockbackDuration,
				false,
				true,
			);
		this.journal
			.fetchUtil(attackerCharacter)
			?.writeFor(
				MiscState.Cutscene,
				true,
				ClashProperties.Duration + ClashProperties.KnockbackDuration,
				false,
				true,
			);
		this.replicator.replicate(attackedCharacter, attackedClashAnim, true, true);
		this.replicator.replicate(attackerCharacter, attackerClashAnim, true, true);
		this.sendFieldOfView(attackedCharacter, attackerCharacter);
		this.sendScreenshake(attackedCharacter, attackerCharacter);
		task.wait(ClashProperties.Duration);
		this.replicator.replicate(attackedCharacter, attackedClashAnim, false);
		this.replicator.replicate(attackerCharacter, attackerClashAnim, false);
		this.setEndingKnockback(context);
		return true;
	}

	public isOnCooldown(...args: CharacterModel[]): boolean {
		for (const character of args) if (this.recentClashes.includes(character)) return true;
		return false;
	}

	private async giveClashCooldown(...args: CharacterModel[]): Promise<void> {
		return await forLoopArrayExpression(args, async (character) =>
			noop(
				this.recentClashes.push(character),
				SuperJanitor.set(
					`Clashing${character}`,
					() => (this.recentClashes = this.recentClashes.filter((recentChar) => recentChar !== character)),
					ClashProperties.Cooldown,
					true,
				),
			),
		);
	}

	private sendScreenshake(...characters: CharacterModel[]) {
		for (const character of characters) {
			this.journal
				.fetchUtil(character)
				?.writeFor(CameraState.Clashing, true, ClashProperties.Duration, false, true);
			this.screenshake.invoke(character, ScreenShakePresets.Clash);
		}
	}

	private sendFieldOfView(...characters: CharacterModel[]) {
		for (const character of characters) {
			const util = this.journal.fetchUtil(character);
			if (!util) continue;
			this.journal
				.fetchUtil(character)
				?.writeFor(CameraState.FieldOfViewManipulate, true, ClashProperties.Duration, false, true);
			this.fieldofview.invoke(character, FieldOfViewPresets.Clash);
		}
	}

	private setEndingKnockback(context: HitData): void {
		const { attacker, attacked } = context;
		const attackedCharacter = attacked.character;
		const attackerCharacter = attacker.character;
		const attackedKnockbackAnim = this.util.get_knockback_anim(attackedCharacter) ?? "knockback1";
		const attackerKnockbackAnim = this.util.get_knockback_anim(attackerCharacter) ?? "knockback1";
		this.replicator.replicate(attackedCharacter, attackedKnockbackAnim, true, false);
		this.replicator.replicate(attackerCharacter, attackerKnockbackAnim, true, false);
		this.push.set(
			attacked.character,
			{
				vector: new Vector3(0, 0, 1),
				duration: ClashProperties.KnockbackDuration,
				power: ClashProperties.KnockbackPower,
				unturnable: true,
				useVector: true,
			},
			true,
		);

		this.push.set(
			attacker.character,
			{
				vector: new Vector3(0, 0, 1),
				duration: ClashProperties.KnockbackDuration,
				power: ClashProperties.KnockbackPower,
				unturnable: true,
				useVector: true,
			},
			true,
		);
	}
}
