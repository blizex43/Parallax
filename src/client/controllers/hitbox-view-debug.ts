import { Controller, OnStart } from "@flamework/core";
import { WebsocketController } from "./state";
import { CharmHandler } from "shared/classes/charm-handler";
import { MiscState } from "shared/enums/config-enum";
import { Workspace as World } from "@rbxts/services";
import { isBoxHandleAdornment } from "shared/utility/t-isA";
import { Janitor } from "@rbxts/janitor";
import { StateType } from "shared/structs/websocket";
import { noop } from "shared/utility/functions";
@Controller()
export class HitboxViewDebugController extends CharmHandler implements OnStart {
	public charm!: StateType;
	private readonly terrain: Terrain = World.Terrain;
	private readonly adornments: BoxHandleAdornment[] = [];
	private readonly adornmentJanitor: Janitor = new Janitor();
	public constructor(private readonly ws: WebsocketController) {
		super((...args) => ws.get(...args), MiscState.Debug);
	}
	public onStart(): void {
		for (const adornment of this.terrain.GetChildren()) this.iterateAdornments(adornment);
		this.terrain.ChildAdded.Connect((adornment) =>
			noop(
				isBoxHandleAdornment(adornment) &&
				(this.iterateAdornments(adornment), this.charm.status && this.addAdornmentToJanitor(adornment)),
			),
		);
		this.onChanged();
	}

	private onChanged() {
		this.charm.changed.Connect((on) => (on ? this.wakeAdornments() : this.sleepAdornments()));
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
