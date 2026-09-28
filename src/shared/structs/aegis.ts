import type { Action } from "@rbxts/action-journal";
import type { GameState } from "./journal";
import { AegisPorts } from "shared/enums/aegis-enum";
export type StatusCodes = 400 | 200;
export interface JournalAegisSync {
	[AegisPorts.JournalSync]: {
		action: Action<GameState, string>;
		status: StatusCodes;
	};
}
