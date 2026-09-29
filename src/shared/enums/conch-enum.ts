import type { RoleInformation } from "shared/structs/conch";

export const ConchRoleInformation: RoleInformation = {
	Admin: { permissions: ["kick", "spawn"] },
	Developer: {
		permissions: ["all"],
		userId: [4225805526, 99574819],
		userName: [],
		groupId: [179329792],
		groupRoles: ["Developers"],
	},
	Moderator: { permissions: ["kick", "spawn"] },
	Owner: { permissions: ["kick", "spawn"] },
	Tester: { permissions: ["kick", "spawn"] },
	Visitor: { permissions: ["kick", "spawn"] },
};
export const ConchRoles = <const>["Admin", "Developer", "Moderator", "Owner", "Tester", "Visitor"];
export const ConchCommands = <const>["kick", "spawn", "set", "toggle_debug", "query", "teleport"];
export const ConchPermissions = <const>["kick", "spawn", "set", "toggle_debug", "query", "teleport", "all"];
export const CustomConchTypeNames = <const>["entity", "behavior"];
export const ConchKeybind = Enum.KeyCode.F3;
