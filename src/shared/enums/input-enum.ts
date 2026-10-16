import type { RawInput } from "@rbxts/mechanism";
export interface ControlsType {
	[x: string]: {
		enum: string;
		keys: RawInput[];
	};
}

export const BaseControlsEnum = <const>{
	Light: {
		enum: "LightEnum",
		keys: ["MouseButton1"],
	},

	Equip: {
		enum: "EquipEnum",
		keys: ["E"],
	},

	Heavy: {
		enum: "HeavyEnum",
		keys: ["MouseButton2"],
	},

	Sprint: {
		enum: "SprintEnum",
		keys: ["W"],
	},

	Dash: {
		enum: "DashEnum",
		keys: ["Q"],
	},

	Block: {
		enum: "BlockEnum",
		keys: ["F"],
	},

	Shiftlock: {
		enum: "ShiftlockEnum",
		keys: ["LeftShift"],
	},

	Debug: {
		enum: "DebugEnum",
		keys: ["LeftAlt", "D"],
	},
};
