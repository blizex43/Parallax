import type { OverloadType, Type } from "@rbxts/conch";
import type { ConchCommands, ConchPermissions, ConchRoles, CustomConchTypeNames } from "shared/enums/conch-enum";
export type Roles = ArrayUnionViewable<typeof ConchRoles>;
export type CommandName = ArrayUnionViewable<typeof ConchCommands>;
export type PermissionName = ArrayUnionViewable<typeof ConchPermissions>;
export type CustomConchTypeName = ArrayUnionViewable<typeof CustomConchTypeNames>;
export type RoleInformation = Record<Roles, RoleData>;
export type RegistryType = Record<CommandName, RegistryData>;
export type CustomConchTableType = Record<CustomConchTypeName, CustomConchTypeData>;
export interface RoleData {
	permissions: PermissionName[];
	groupId?: number[];
	groupRoles?: string[];
	userId?: number[];
	userName?: string[];
}
export interface RegistryData {
	permissions: PermissionName[];
	arguments: () => LuaTuple<(Type | OverloadType)[]>;
	callback: Callback;
}

export interface CustomConchTypeData {
	description: string;
	bundle: string[];
}
