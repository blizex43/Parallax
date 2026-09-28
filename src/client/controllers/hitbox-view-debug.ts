import { Controller, OnStart } from "@flamework/core";
import { MiscState } from "shared/enums/config-enum";
import { Workspace as World } from "@rbxts/services";
import { isBoxHandleAdornment } from "shared/utility/t-isA";
import { Janitor } from "@rbxts/janitor";
import { noop } from "shared/utility/functions";
import { JournalHandler } from "shared/classes/journal-handler";
import type { JournalController } from "./journal";
@Controller()
export class HitboxViewDebugController extends JournalHandler implements OnStart {
	// public charm!: StateType;
	private readonly terrain: Terrain = World.Terrain;
	private readonly adornments: BoxHandleAdornment[] = [];
	private readonly adornmentJanitor: Janitor = new Janitor();
	public constructor(private readonly journal: JournalController) {
		super(journal.util);
	}
	public onStart(): void {
		for (const adornment of this.terrain.GetChildren()) this.iterateAdornments(adornment);
		this.terrain.ChildAdded.Connect((adornment) =>
			noop(
				isBoxHandleAdornment(adornment) &&
					(this.iterateAdornments(adornment),
					this.journalUtil.read<boolean>(MiscState.Debug) && this.addAdornmentToJanitor(adornment)),
			),
		);
		this.onChanged();
	}

	private onChanged() {
		this.journalUtil
			.getPathChanged<boolean>(MiscState.Debug)
			.Connect((on) => (on.newValue ? this.wakeAdornments() : this.sleepAdornments()));
	}

	private handleAdornment(adornment: BoxHandleAdornment): void {
		this.adornments.push(adornment);
	}

	private wakeAdornments() {
		for (const adornment of this.adornments) this.addAdornmentToJanitor(adornment);
	}

	private addAdornmentToJanitor(adornment: BoxHandleAdornment): RBXScriptConnection {
		return this.adornmentJanitor.Add(
			adornment.GetPropertyChangedSignal("Visible").Connect(() => {
				if (adornment.Transparency !== 0.3) adornment.Transparency = 0.3;
			}),
		);
	}

	private sleepAdornments() {
		for (const adornment of this.adornments) {
			this.adornmentJanitor.Cleanup();
			adornment.Transparency = 1;
		}
	}

	private iterateAdornments(adornment: Instance): void {
		return void (isBoxHandleAdornment(adornment) && this.handleAdornment(adornment));
	}
}
