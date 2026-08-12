import { Service } from "@flamework/core";
import type { OnCharacterRemove } from "shared/hooks";
import { CombatState, MiscState, MovementState } from "shared/enums/config-enum";
import type { WebsocketManagementService } from "./websocket-manager";
import type { StaminaService } from "./stamina";
import type { ScalingService } from "./scaling";
import type { DataService } from "./third-party/data";
import type { GUIDService } from "./guid";
import type { PsuedoPlayerData } from "shared/data-models/player-data";
import { Players } from "@rbxts/services";

@Service()
export class SprintService implements OnCharacterRemove {
	public constructor(
		private readonly ws: WebsocketManagementService,
		private readonly stamina: StaminaService,
		private readonly scaling: ScalingService,
		private readonly guid: GUIDService,
		private readonly database: DataService,
	) { }

	public handleSprint(character: CharacterModel, on: boolean): void {
		if (on && this.canSprint(character)) this.startSprintFunction(character);
		else this.endSprintFunction(character);
	}

	public startSprintFunction(character: CharacterModel) {
		this.stamina.setNegativeRegen(character, this.scaling.getStaminaSprintRegen(this.data(character)));
		print("Sprint Started");
	}

	public endSprintFunction(character: CharacterModel) {
		if (this.ws.getStateValue(character, MovementState.Sprint))
			this.ws.setState(character, MovementState.Sprint, false);
		this.stamina.setPositiveRegen(character);
	}

	public canSprint(character: CharacterModel): boolean {
		const manager = this.ws.getManager(character);
		if (!manager) return false;
		return manager.isAllValue(
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
		return void this.ws.setState(character, MovementState.Sprint, false);
	}
}
