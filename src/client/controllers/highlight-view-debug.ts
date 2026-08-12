import { Controller } from "@flamework/core";
import { Workspace as World } from "@rbxts/services";
import { ClientDebugger } from "client/classes/client-debugger";
import { FlameworkCharms } from "shared/constants";
import { OnCharmSubscribed } from "shared/decorators";
import type { CharacterController } from "./character";
import type { HighlightController } from "./highlight";
import {
	EffectHighlightColors,
	EffectHighlightTransitionTime,
	EffectHighlightTransparency,
} from "shared/enums/effect-enum";
import { WebsocketController } from "./state";
import { MiscState } from "shared/enums/config-enum";
@Controller()
export class HighlightViewDebugController extends ClientDebugger {
	readonly folder: Folder = World.WaitForChild("Hurtbox");
	public constructor(
		private readonly character: CharacterController,
		private readonly highlight: HighlightController,
		private readonly ws: WebsocketController,
	) {
		super();
	}

	@OnCharmSubscribed(FlameworkCharms.Windup)
	public onDebug(on: boolean): void {
		if (!this.isDebug()) return;
		if (on)
			this._start(
				EffectHighlightColors.Windup,
				EffectHighlightTransparency.Windup,
				EffectHighlightTransitionTime.Windup,
			);
		else this._end(1);
	}

	@OnCharmSubscribed(FlameworkCharms.Attacking)
	public onDebug2(on: boolean): void {
		if (!this.isDebug()) return;
		if (on)
			this._start(
				EffectHighlightColors.Attacking,
				EffectHighlightTransparency.Attacking,
				EffectHighlightTransitionTime.Attacking,
			);
		else this._end(1);
	}

	@OnCharmSubscribed(FlameworkCharms.FullStunned)
	public onDebug3(on: boolean): void {
		if (!this.isDebug()) return;
		if (on)
			this._start(
				EffectHighlightColors.Stun,
				EffectHighlightTransparency.Stun,
				EffectHighlightTransitionTime.Stun,
			);
		else this._end(1);
	}

	@OnCharmSubscribed(FlameworkCharms.Recovery)
	public onDebug4(on: boolean): void {
		if (!this.isDebug()) return;
		if (on)
			this._start(
				EffectHighlightColors.Windup,
				EffectHighlightTransparency.Windup,
				EffectHighlightTransitionTime.Windup,
			);
		else this._end(1, false);
	}

	@OnCharmSubscribed(FlameworkCharms.Stunned)
	public onDebug5(on: boolean): void {
		if (!this.isDebug()) return;
		if (on)
			this._start(
				EffectHighlightColors.Stun,
				EffectHighlightTransparency.Stun,
				EffectHighlightTransitionTime.Stun,
			);
		else this._end(1, false);
	}

	@OnCharmSubscribed(FlameworkCharms.Iframes)
	public onDebug6(on: boolean): void {
		if (!this.isDebug()) return;
		if (on)
			this._start(
				EffectHighlightColors.Iframe,
				EffectHighlightTransparency.Iframe,
				EffectHighlightTransitionTime.Iframe,
			);
		else this._end(1, false);
	}

	public _start(
		color: Color3,
		transparency: number,
		transitionTime: number = EffectHighlightTransitionTime.Windup,
	): void {
		const character = this.character.get();
		if (!character) return;
		this.highlight.lerpColor(character, color, transitionTime, "FillColor");
		this.highlight.lerpTransparency(character, transparency, transitionTime, "FillTransparency");
	}
	public _end(transparency: number, remember: boolean = true): void {
		const character = this.character.get();
		if (!character) return;
		this.highlight.lerpTransparency(
			character,
			transparency,
			EffectHighlightTransitionTime.Windup,
			"FillTransparency",
			remember,
		);
	}

	public isDebug(): boolean {
		const mgr = this.ws.get(MiscState.Debug);
		return <boolean>mgr.status;
	}
}
