import { Service } from "@flamework/core";
import { OnCharacterRemove } from "shared/hooks";
import type { StateType } from "shared/structs/websocket";
import { CombatState, MiscState } from "shared/enums/config-enum";
import { Players } from "@rbxts/services";
import type { AnimationReplicatorService } from "./animation-replicator";
import type { WebsocketManagementService } from "./websocket-manager";

@Service()
export class BlockService implements OnCharacterRemove {
	public constructor(
		private readonly ws: WebsocketManagementService,
		private readonly anim: AnimationReplicatorService,
	) { }

	public handleBlock(character: CharacterModel, block: boolean): void {
		const alreadyBlocking = this.getBlock(character);
		const npc = !Players.GetPlayerFromCharacter(character);
		if (block === alreadyBlocking) return;
		const result = !this.canBlock(character) ? false : block;
		if (result && npc) {
			this.anim.replicate(character, "block", true);
			this.ws.setState(character, CombatState.Block, true);
		} else if (npc && alreadyBlocking) {
			this.anim.replicate(character, "block", false);
			this.ws.setState(character, CombatState.Block, false);
		}
	}

	public canBlock(character: CharacterModel): boolean {
		const mgr = this.ws.getManager(character);
		if (!mgr) return false;
		return mgr.isAllValue(
			[
				CombatState.Windup,
				CombatState.Attacking,
				CombatState.Recovery,
				CombatState.BlockBroken,
				CombatState.Exhausted,
				CombatState.Knocked,
				CombatState.Exhausted,
				CombatState.Stunned,
				CombatState.FullStunned,
				CombatState.Ragdoll,
				MiscState.Cutscene,
			],
			false,
		);
	}

	public getBlock(character: CharacterModel): Maybe<boolean> {
		return this.ws.getStateValue<boolean>(character, CombatState.Block);
	}

	public getBlockBroken(character: CharacterModel): Maybe<StateType<boolean>> {
		return this.ws.getCharm<boolean>(character, CombatState.BlockBroken);
	}

	public onCharacterRemove(character: CharacterModel): void {
		return void this.ws.setState(character, CombatState.Block, false);
	}
}
