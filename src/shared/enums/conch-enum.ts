import type { RoleInformation } from "shared/structs/conch";
import * as Conch from "@rbxts/conch";
import { NPCPresets } from "./npc-enum";
import { INITIAL_DATA } from "shared/data-models/player-data";
import Object from "@rbxts/object-utils";
type ConchTypeData = Parameters<typeof Conch.register_type>[1];
export const ConchRoleInformation: RoleInformation = {
	admin: { permissions: ["kick", "spawn", "teleport", "toggle_debug"] },
	developer: {
		permissions: ["kick", "spawn", "set", "toggle_debug", "query", "teleport"],
		userId: [4225805526, 99574819],
		userName: [],
		groupId: [179329792],
		groupRoles: ["Developers"],
	},
	moderator: { permissions: ["kick", "spawn", "teleport", "toggle_debug"] },
	owner: { permissions: ["kick", "spawn", "set", "toggle_debug", "query", "teleport"] },
	tester: { permissions: ["toggle_debug"] },
	visitor: { permissions: [] },
};
export const ConchRoles = <const>["admin", "developer", "moderator", "owner", "tester", "visitor"];
export const ConchCommands = <const>["kick", "spawn", "set", "toggle_debug", "query", "teleport"];
export const ConchPermissions = <const>["kick", "spawn", "set", "toggle_debug", "query", "teleport"];
export const CustomConchTypeNames = <const>["entity", "behavior"];
export const ConchKeybind = Enum.KeyCode.F2;

export const QuickRegisterConchType = (options: readonly string[], name: string, description?: string) =>
	Conch.register_type(name, <ConchTypeData>(<unknown>Conch.args.enum_new(<unknown[]>options, name, description)))(
		name,
		description,
	);
export const ConchPresets = <const>{
	NPC: QuickRegisterConchType(NPCPresets, "preset", "The NPC preset to spawn"),
	DataKeys: QuickRegisterConchType(Object.keys(INITIAL_DATA), "key", "The data-type to set"),
};
