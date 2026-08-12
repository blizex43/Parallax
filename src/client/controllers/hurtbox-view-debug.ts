import { Controller } from "@flamework/core";
import { Workspace as World } from "@rbxts/services";
import { ClientDebugger } from "client/classes/client-debugger";
import { FlameworkCharms } from "shared/constants";
import { OnCharmSubscribed } from "shared/decorators";

@Controller()
export class HurtboxViewDebugController extends ClientDebugger {
	readonly folder: Folder = World.WaitForChild("Hurtbox");
	@OnCharmSubscribed(FlameworkCharms.Debug)
	public onDebug(on: boolean): void {
		if (on) this._start();
		else this._end();
	}
	public _start(): void {
		for (const hurtbox of this.folder.GetChildren<BasePart>()) hurtbox.Transparency = 0;
	}
	public _end(): void {
		for (const hurtbox of this.folder.GetChildren<BasePart>()) hurtbox.Transparency = 1;
	}
}
