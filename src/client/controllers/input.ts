import { Controller } from "@flamework/core";
import { CompositeActionBuilder, RepeatActionBuilder, StandardActionBuilder } from "@rbxts/mechanism";
import type { LogStart } from "shared/hooks";
import { OnInput, OnInputRelease } from "client/decorators";
import { BaseControlsEnum } from "shared/enums/input-enum";
import { CombatState, MovementState, StateEvents } from "shared/enums/config-enum";
import { Cooldown } from "shared/decorators";
import { BlockCooldown } from "shared/enums/block-enum";
import { DefaultSprintStartInterval } from "shared/enums/sprint-enum";
import { Events } from "client/network";
import { CmdrClient } from "@rbxts/cmdr";
export const enum ActionID {
	LMB,
	RMB,
	MMB,
	LeftTrigger,
	RightTrigger,
	Crouch,
}

/** Handles all game input */
@Controller()
export class InputController implements LogStart {
	/* Input Starts */
	@OnInput(new StandardActionBuilder("C").setID(ActionID.Crouch))
	public crouch(): void {
		// code for crouching
		print("crouched");
	}

	@OnInput(new StandardActionBuilder(...BaseControlsEnum.Dash.keys).setID(BaseControlsEnum.Dash.enum))
	public dash() {
		StateEvents[MovementState.Dash].Fire();
	}

	@OnInput(new StandardActionBuilder(...BaseControlsEnum.Equip.keys).setID(BaseControlsEnum.Equip.enum))
	public equip() {
		StateEvents[CombatState.CombatEquip].Fire();
	}

	@Cooldown(DefaultSprintStartInterval)
	@OnInput(
		new RepeatActionBuilder(...BaseControlsEnum.Sprint.keys)
			.setRepeats(2)
			.setTiming(DefaultSprintStartInterval)
			.setID(BaseControlsEnum.Sprint.enum),
	)
	public sprint() {
		StateEvents[MovementState.Sprint].Fire(true);
	}

	@OnInput(
		new CompositeActionBuilder(...BaseControlsEnum.Debug.keys).setTiming(0.2).setID(BaseControlsEnum.Debug.enum),
	)
	public openDebug() {
		Events.debug.subscribe();
	}

	@Cooldown(BlockCooldown)
	@OnInput(
		new StandardActionBuilder(...BaseControlsEnum.Block.keys)
			.setCooldown(BlockCooldown)
			.setID(BaseControlsEnum.Block.enum),
	)
	public block() {
		StateEvents[CombatState.Block].Fire(true);
	}

	@OnInput(new StandardActionBuilder(...BaseControlsEnum.Cmdr.keys).setID(BaseControlsEnum.Cmdr.enum))
	public cmdr() {
		CmdrClient.Show();
	}

	/* Input Ends */
	@OnInputRelease(BaseControlsEnum.Sprint.enum)
	public sprintEnd() {
		StateEvents[MovementState.Sprint].Fire(false);
	}

	@OnInput(
		new StandardActionBuilder(...BaseControlsEnum.Shiftlock.keys)
			.setID(BaseControlsEnum.Shiftlock.enum)
			.setProcessed(false),
	)
	public shift() {
		StateEvents[MovementState.Shiftlocked].Fire();
	}

	@OnInputRelease(BaseControlsEnum.Block.enum)
	public blockEnd() {
		StateEvents[CombatState.Block].Fire(false);
	}

	@OnInputRelease(ActionID.Crouch)
	public stand(): void {
		// code for standing
		print("stood");
	}
}
