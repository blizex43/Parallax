import type { AILevelType } from "shared/structs/npc";

const pollingRates: Record<AILevelType, number> = {
	easy: 0.5,
	normal: 2,
	hard: 5,
	supreme: 10,
};

export class ElectricityCompartment {
	public getPollingInterval(mastery?: AILevelType): number {
		return 1 / pollingRates[mastery ?? "normal"];
	}
}
