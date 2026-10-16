import type { StaminaService } from "serverstorage/services/stamina";
import type { AttackLiterals } from "shared/structs/attack";
import type { Memories } from "shared/structs/brain";
import type { NPCAction } from "shared/structs/brain";

export class ResourceCompartment {
	public constructor(private readonly stamina: StaminaService) {}

	public chooseAttack(
		character: CharacterModel,
		memories: Memories,
		action: NPCAction,
		canLight: boolean,
		canHeavy: boolean,
	): Maybe<AttackLiterals> {
		if (action !== "Attack") return;
		const stamina = this.stamina.getCurrent(character) ?? 0;
		const wantsHeavy = memories.preset === "heavy-attacker" || (memories.preset === undefined && stamina >= 12);
		if (wantsHeavy && canHeavy && stamina >= 4) return "Heavy";
		if (canLight) return "Light";
		if (canHeavy && stamina >= 4) return "Heavy";
		return;
	}
}
