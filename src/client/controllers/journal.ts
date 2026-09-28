import { Controller, type OnStart } from "@flamework/core";
import { ActionJournal, JournalMode, StateManager } from "@rbxts/action-journal";
import { AegisClient as Aegis } from "@rbxts/aegis";
import { deepCopy } from "@rbxts/object-utils";
import { JournalUtil } from "shared/classes/journal-util";
import { SpawnTask } from "shared/decorators";
import { AegisPorts } from "shared/enums/aegis-enum";
import { GameStateCopy } from "shared/enums/journal-enum";
import type { LogStart } from "shared/hooks";
import type { JournalAegisSync } from "shared/structs/aegis";
import { GameState } from "shared/structs/journal";
@Controller()
export class JournalController implements OnStart, LogStart {
	private readonly journalAegis = new Aegis<JournalAegisSync>();
	public readonly state: StateManager<GameState> = new StateManager(deepCopy(GameStateCopy));
	public readonly util: JournalUtil<StateManager<GameState>> = new JournalUtil(this.state);
	public readonly actions: ActionJournal<GameState> = new ActionJournal(this.state, {
		mode: JournalMode.Sync,
	});
	@SpawnTask()
	public async onStart(): Promise<void> {
		this.setupJournalAegisListener();
	}

	private setupJournalAegisListener(): void {
		this.journalAegis.on(
			AegisPorts.JournalSync,
			(bundle) => bundle.status === 200 && this.actions.add(bundle.action),
		);
	}
}
