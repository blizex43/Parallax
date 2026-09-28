import { Cooldown, OnSignalSubscribed } from "shared/decorators";
import { CombatState, StateEvents } from "shared/enums/config-enum";
import type { OnCharacterAdd } from "shared/hooks";
import type { CharacterController } from "./character";
import { EquipDebounce } from "shared/enums/keyboard-enum";
import { Controller, type OnStart } from "@flamework/core";
import { JournalHandler } from "shared/classes/journal-handler";
import type { JournalController } from "./journal";

@Controller()
export class KeyboardController extends JournalHandler implements OnStart, OnCharacterAdd {
	// public charm!: StateType<boolean>;
	constructor(
		private readonly character: CharacterController,
		readonly journal: JournalController,
	) {
		super(journal.util);
	}
	onStart(): void {
		this.runMethods([
			{
				handleType: "blacklist",
				paths: [CombatState.Block, CombatState.Ragdoll, CombatState.Exhausted],
				behavior: "Run If Single True",
			},
			{
				handleType: "revert",
				paths: [CombatState.CombatEquip],
				behavior: "Run If Single True",
				revertValue: false,
			},
		]);
	}
	@OnSignalSubscribed(StateEvents[CombatState.CombatEquip])
	@Cooldown(EquipDebounce)
	public equip() {
		if (!this.canUse()) return;
		this.journalUtil.write(
			CombatState.CombatEquip,
			!this.journalUtil.read<boolean>(CombatState.CombatEquip),
			"KeyboardController",
		);
	}

	public canUse(): boolean {
		return !this.isBlacklisted();
	}

	public async onCharacterAdd(): Promise<void> {
		const humanoid = this.character.getHumanoid() ?? (await this.character.mustGetHumanoid());
		humanoid.Died.Once(() => this.revert());
	}
}
