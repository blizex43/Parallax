import { CastNames } from "shared/enums/cast-enum";
import { CombatState, MiscState, MovementState } from "shared/enums/config-enum";

export type CastableNameType = (typeof CastNames)[number];
export interface CastableEnum {
	name: CastableNameType;
	castables: (CombatState | MovementState | MiscState)[];
}
