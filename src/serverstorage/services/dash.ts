import { Service } from "@flamework/core";
import type { OnCharacterRemove } from "shared/hooks";
import { CombatState, MiscState, MovementState } from "shared/enums/config-enum";
import type { JournalService } from "./journal";
import type { StaminaService } from "./stamina";
import type { ScalingService } from "./scaling";
import type { DataService } from "./third-party/data";
import type { GUIDService } from "./guid";
import type { PsuedoPlayerData } from "shared/data-models/player-data";
import { Players } from "@rbxts/services";
import { DashProperties } from "shared/enums/push-enum";

@Service()
export class DashService implements OnCharacterRemove {
	public constructor(
		private readonly journal: JournalService,
		private readonly stamina: StaminaService,
		private readonly scaling: ScalingService,
		private readonly guid: GUIDService,
		private readonly database: DataService,
	) { }

	public handleDash(character: CharacterModel, on: boolean): void {
		if (!on) return;
		this.startDashFunction(character);
	}

	public startDashFunction(character: CharacterModel) {
		this.stamina.disable(character, true, DashProperties.Duration);
		this.stamina.harm(character, this.scaling.getDashStaminaTake(this.data(character)), undefined, false);
		print("Dash Started");
	}

	public canDash(character: CharacterModel): boolean {
		const util = this.journal.fetchUtil(character);
		if (!util) return false;
		return util.isPathValuesEqualTo(
			[
				CombatState.Stunned,
				CombatState.FullStunned,
				CombatState.BlockBroken,
				CombatState.Block,
				CombatState.Windup,
				CombatState.Recovery,
				CombatState.Attacking,
				CombatState.Ragdoll,
				CombatState.Knocked,
				CombatState.Exhausted,
				MovementState.NoMove,
				MiscState.Cutscene,
			],
			false,
		);
	}

	private data(character: CharacterModel): PsuedoPlayerData {
		const player = <Maybe<Player>>Players.GetPlayerFromCharacter(character);
		return player ? this.database.get(player) : this.database.getPsuedo(this.guid.get(character));
	}

	public onCharacterRemove(character: CharacterModel): void {
		return void this.journal.writeStateValue(character, MovementState.Dash, false);
	}
}
