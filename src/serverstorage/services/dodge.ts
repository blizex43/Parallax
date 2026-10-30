import { Service } from "@flamework/core";
import { Events } from "serverstorage/network";
import { LinkRemote } from "serverstorage/decorators";
import { JournalService } from "./journal";
import { CombatState, MiscState, MovementState } from "shared/enums/config-enum";
import { DodgeProperties } from "shared/enums/dodge-enum";
import type { AttackContext, GuardbreakTier, HitData } from "shared/structs/attack";
import type { OnCharacterRemove } from "shared/hooks";
import { Players } from "@rbxts/services";
import { isCharacterModel } from "shared/utility/t-isA";

interface DodgeAttempt {
	evaded: boolean;
}

@Service()
export class DodgeService implements OnCharacterRemove {
	private readonly activeDodges = new Map<CharacterModel, DodgeAttempt>();
	private readonly cooldownEndsAt = new Map<CharacterModel, number>();
	private readonly evadedAttacks = new Map<CharacterModel, Set<AttackContext>>();

	public constructor(private readonly journal: JournalService) {}

	@LinkRemote(Events.game.dodge)
	public onDodge(player: Player): void {
		const character = player.Character;
		if (!character || !isCharacterModel(character)) return;

		const now = os.clock();
		const cooldownEndsAt = this.cooldownEndsAt.get(character);
		if (cooldownEndsAt !== undefined && cooldownEndsAt > now) return;
		if (!this.canDodge(character)) {
			Events.game.dodgeReset.fire(player, true);
			return;
		}

		const attempt: DodgeAttempt = { evaded: false };
		this.activeDodges.set(character, attempt);
		this.cooldownEndsAt.set(character, now + DodgeProperties.cooldown);
		this.journal.writeStateValue(character, CombatState.Dodge, true, "DodgeService");

		task.delay(DodgeProperties.evadeWindow, () => {
			if (this.activeDodges.get(character) !== attempt) return;
			this.activeDodges.delete(character);
			this.journal.writeStateValue(character, CombatState.Dodge, false, "DodgeService");
			if (!attempt.evaded)
				this.journal
					.fetchUtil(character)
					?.writeFor(CombatState.Stunned, true, DodgeProperties.failedStun, false, true, "DodgeService");
		});
	}

	public tryEvade(context: HitData): boolean {
		const character = context.attacked.character;
		const attack = context.attacker;
		if (this.getGuardbreakTier(context) === "Tier2") return false;

		const evadedAttacks = this.evadedAttacks.get(character);
		if (evadedAttacks?.has(attack)) return true;

		const attempt = this.activeDodges.get(character);
		if (!attempt) return false;

		attempt.evaded = true;
		this.activeDodges.delete(character);
		this.cooldownEndsAt.delete(character);
		this.journal.writeStateValue(character, CombatState.Dodge, false, "DodgeService");
		this.rememberEvadedAttack(character, attack);

		const player = Players.GetPlayerFromCharacter(character);
		if (player) Events.game.dodgeReset.fire(player, false);
		return true;
	}

	public onCharacterRemove(character: CharacterModel): void {
		this.activeDodges.delete(character);
		this.cooldownEndsAt.delete(character);
		this.evadedAttacks.delete(character);
	}

	public clearEvadedAttack(attack: AttackContext): void {
		for (const [character, attacks] of this.evadedAttacks) {
			attacks.delete(attack);
			if (attacks.size() === 0) this.evadedAttacks.delete(character);
		}
	}

	private canDodge(character: CharacterModel): boolean {
		const humanoid = character.FindFirstChildOfClass("Humanoid");
		if (!humanoid || humanoid.Health <= 0 || this.activeDodges.has(character)) return false;

		const blockedStates = [
			CombatState.Windup,
			CombatState.Recovery,
			CombatState.Attacking,
			CombatState.BlockBroken,
			CombatState.Stunned,
			CombatState.FullStunned,
			CombatState.Exhausted,
			CombatState.Knocked,
			CombatState.Ragdoll,
			MovementState.NoMove,
			MiscState.Cutscene,
		];
		return blockedStates.every((state) => !this.journal.fetchStateValue<boolean>(character, state));
	}

	private getGuardbreakTier(context: HitData): GuardbreakTier | undefined {
		return context.properties.breaker ? (context.properties.breaker.tier ?? "Tier1") : undefined;
	}

	private rememberEvadedAttack(character: CharacterModel, attack: AttackContext): void {
		let attacks = this.evadedAttacks.get(character);
		if (!attacks) {
			attacks = new Set<AttackContext>();
			this.evadedAttacks.set(character, attacks);
		}
		attacks.add(attack);
	}
}
