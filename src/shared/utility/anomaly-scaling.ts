import { AnomalyTuning } from "shared/enums/anomaly-enum";
import { StatTuning } from "shared/enums/scale-enum";
import type { AnomalyLiterals } from "shared/structs/attack";
import type { PsuedoPlayerData } from "shared/data-models/player-data";
import type { Styles } from "shared/structs/styles";

export function getMasteryBuildupMultiplier(data: PsuedoPlayerData): number {
	const intelligence = math.clamp(data.intelligence / StatTuning.cap.intelligence, 0, 1);
	const mastery = intelligence * AnomalyTuning.intelligenceMasteryShare;
	return 1 + mastery * AnomalyTuning.masteryBuildupBonus;
}

export function getProcDamageMultiplier(data: PsuedoPlayerData, anomalyType: AnomalyLiterals, style: Styles): number {
	if (anomalyType === "Adaptation") return 1;
	const intelligence = math.clamp(data.intelligence / StatTuning.cap.intelligence, 0, 1);
	const strength = math.clamp(data.strength / StatTuning.cap.strength, 0, 1);
	const agility = math.clamp(data.agility / StatTuning.cap.agility, 0, 1);
	let proficiency = intelligence * AnomalyTuning.intelligenceProficiencyShare;
	if (style === "Raishin") {
		proficiency +=
			strength * AnomalyTuning.raishinStrengthProficiency + agility * AnomalyTuning.raishinAgilityProficiency;
	} else {
		proficiency += strength * AnomalyTuning.strengthProficiencyByAnomaly[anomalyType];
		if (anomalyType === "Electric") proficiency += agility * AnomalyTuning.electricAgilityProficiency;
	}

	return 1 + proficiency * AnomalyTuning.proficiencyDamageBonus;
}
