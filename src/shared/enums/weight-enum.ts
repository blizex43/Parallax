import type { CharacterLimbsType } from "shared/structs/model";

export const WeightlessLimbsEnum: Partial<CharacterLimbsType>[] = [
	"Right Leg",
	"Left Leg",
	"Right Arm",
	"Left Arm",
	"Torso",
];
export const RootCustomPhysicalProperties: PhysicalProperties = new PhysicalProperties(2, 0.3, 0.5);
