import type { CastableEnum } from "shared/structs/cast";
import { CombatState, MiscState } from "./config-enum";

export const CastNames = <const>["Attack"];
export const CastEnums: CastableEnum[] = <const>[
	{
		name: "Attack",
		castables: [
			CombatState.Windup,
			CombatState.Ragdoll,
			CombatState.Stunned,
			CombatState.FullStunned,
			CombatState.Attacking,
			CombatState.Recovery,
			CombatState.Knocked,
			CombatState.Exhausted,
			MiscState.Cutscene,
		],
	},
];
