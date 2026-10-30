import type { AttackLiterals } from "shared/structs/attack";
import type { Styles } from "shared/structs/styles";

interface AttackTiming {
	windup: number;
	active: number;
}

const StandardAttackTiming: Record<AttackLiterals, AttackTiming> = {
	Light: { windup: 0.08, active: 0.3 },
	Heavy: { windup: 0.18, active: 0.4 },
};

export const AttackTimingCatalog: Record<Styles, Record<AttackLiterals, AttackTiming>> = {
	Base: StandardAttackTiming,
	Karate: StandardAttackTiming,
	"Muay Thai": StandardAttackTiming,
	Boxing: StandardAttackTiming,
	Taekwondo: StandardAttackTiming,
	Raishin: StandardAttackTiming,
};
