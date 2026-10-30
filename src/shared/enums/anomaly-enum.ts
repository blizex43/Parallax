import { AttackArray } from "shared/enums/combat-enum";
import { baseCombatTagDuration } from "shared/enums/damage-enum";
import type { ClanLiterals } from "shared/structs/info";
import type { AnomalySpec } from "shared/structs/attack";

export const AnomalyTuning = <const>{
	maximumBuildup: 100,
	outOfCombatDecayPerSecond: 2,
	outOfCombatGracePeriod: baseCombatTagDuration,
	attributeUpdateInterval: 0.2,
	adaptationBuildupPerHit: 6,
	adaptationStacksPerProc: 1,
	adaptationMaximumStacks: 7,
	adaptationDamageReductionPerStack: 0.05,
	intelligenceProficiencyShare: 0.8,
	intelligenceMasteryShare: 0.2,
	masteryBuildupBonus: 1,
	proficiencyDamageBonus: 0.5,
	strengthProficiencyByAnomaly: {
		Electric: 0,
		Physical: 0,
		Adaptation: 0,
	},
	electricAgilityProficiency: 0.25,
	raishinStrengthProficiency: 0.25,
	raishinAgilityProficiency: 0.25,
	electric: {
		procDamageMultiplier: 1,
		stunMultiplier: 1.3,
		stunDuration: 5,
	},
	physical: {
		assaultDamageMultiplier: 1,
	},
};

export const AnomalyAttributes = <const>{
	ElectricBuildup: "AnomalyElectric",
	PhysicalBuildup: "AnomalyPhysical",
	AdaptationBuildup: "AnomalyAdaptation",
	AdaptationStacks: "AdaptationStacks",
	PhysicalAssaultReady: "PhysicalAssaultReady",
	ElectricStunExpiresAt: "ElectricStunExpiresAt",
	ElectricStunActive: "ElectricStunActive",
};

export const ClanAnomalyCatalog: Partial<Record<ClanLiterals, AnomalySpec[]>> = {
	Mikazuchi: [
		{
			type: "Electric",
			included: [...AttackArray],
			potency: 20,
			requiredTag: "Skill",
		},
	],
};
