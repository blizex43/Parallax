import { Service } from "@flamework/core";
import { OnCharacterRemove } from "shared/hooks";
import { CombatState, MiscState } from "shared/enums/config-enum";
import { Players } from "@rbxts/services";
import type { AnimationReplicatorService } from "./animation-replicator";
import type { JournalService } from "./journal";

@Service()
export class BlockService implements OnCharacterRemove {
	public constructor(
		private readonly journal: JournalService,
		private readonly anim: AnimationReplicatorService,
	) { }

	public handleBlock(character: CharacterModel, block: boolean): void {
		const alreadyBlocking = this.getBlock(character);
		const npc = !Players.GetPlayerFromCharacter(character);
		if (block === alreadyBlocking) return;
		const result = !this.canBlock(character) ? false : block;
		if (result && npc) {
			this.anim.replicate(character, "block", true);
			this.journal.writeStateValue(character, CombatState.Block, true);
		} else if (npc && alreadyBlocking) {
			this.anim.replicate(character, "block", false);
			this.journal.writeStateValue(character, CombatState.Block, false);
		}
	}

	public canBlock(character: CharacterModel): boolean {
		const util = this.journal.fetchUtil(character);
		if (!util) return false;
		return util.isPathValuesEqualTo(
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
		return this.journal.fetchStateValue<boolean>(character, CombatState.Block);
	}

	public getBlockBroken(character: CharacterModel): Maybe<boolean> {
		return this.journal.fetchStateValue<boolean>(character, CombatState.BlockBroken);
	}

	public onCharacterRemove(character: CharacterModel): void {
		return void this.journal.writeStateValue(character, CombatState.Block, false);
	}
}
