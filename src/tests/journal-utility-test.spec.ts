import { StateManager } from "@rbxts/action-journal";
import { deepCopy } from "@rbxts/object-utils";
import { Theory, InlineData, Assert } from "@rbxts/runit";
import { JournalUtil } from "shared/classes/journal-util";
import { CombatState, VitalityState } from "shared/enums/config-enum";
import { GameStateCopy } from "shared/enums/journal-enum";
class JournalUtilityTest {
	@Theory
	@InlineData(CombatState.Attacking, "player/combat/Attacking")
	@InlineData(CombatState.FullStunned, "player/combat/FullStunned")
	@InlineData(VitalityState.Stamina, "player/health/Stamina")
	public getFullPathOfEntry(input: string, expected: string): void {
		const state = new StateManager(deepCopy(GameStateCopy));
		const util = new JournalUtil(state);
		const path = util.getFullPathOfEntry(input);
		print(path);
		Assert.equal(expected, path);
	}
}

export = JournalUtilityTest;
