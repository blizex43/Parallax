import type { AttackLiterals } from "shared/structs/attack";
import type { Styles } from "shared/structs/styles";

interface AttackTiming {
	windup: number;
	active: number;
}

export const AttackTimingCatalog: Record<Styles, Record<AttackLiterals, AttackTiming>> = {
	Base: {
		Light: { windup: 0.1, active: 0.35 },
		Heavy: { windup: 0.2, active: 0.45 },
	},
	Karate: {
		Light: { windup: 0.1, active: 0.35 },
		Heavy: { windup: 0.2, active: 0.45 },
	},
	"Muay Thai": {
		Light: { windup: 0.1, active: 0.35 },
		Heavy: { windup: 0.2, active: 0.45 },
	},
	Boxing: {
		Light: { windup: 0.1, active: 0.35 },
		Heavy: { windup: 0.2, active: 0.45 },
	},
};
