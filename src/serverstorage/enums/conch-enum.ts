import { args } from "@rbxts/conch";
import type { RegistryType } from "shared/structs/conch";
import type { BehaviorType, EntityType } from "shared/structs/npc";
import kick_cmd from "serverstorage/conch/commands/kick";
import spawn_cmd from "serverstorage/conch/commands/spawn";
import { AIBehaviors, NPCEntitys } from "shared/enums/npc-enum";
import { QuickRegisterConchType } from "shared/enums/conch-types-enum";
import Object from "@rbxts/object-utils";
import { INITIAL_DATA, type PlayerData } from "shared/data-models/player-data";
import teleport_cmd from "serverstorage/conch/commands/teleport";
import set_cmd from "serverstorage/conch/commands/set";
import debug_cmd from "serverstorage/conch/commands/debug";
import query_cmd from "serverstorage/conch/commands/query";

export const ConchRegistry: RegistryType = {
	kick: {
		permissions: ["kick"],
		arguments: () =>
			$tuple(
				args.player("player", "The player you'd like to kick from the game"),
				args.string("reason", "The reason you are kicking this player from the game."),
			),
		callback: (player: Player, reason: string): void => kick_cmd(player, reason),
	},
	spawn: {
		permissions: ["spawn"],
		arguments: () =>
			$tuple(
				args.overload([
					{
						arguments: [
							args.player("player", "The player you'd like the entity to spawn on"),
							QuickRegisterConchType(NPCEntitys, "entity", "Spawn a non-sentient NPC"),
							QuickRegisterConchType(AIBehaviors, "behavior", "The Entity's Behavior"),
						],
						description: "Spawn an Entity into the game",
					},
				]),
			),
		callback: (player: Player, entity: EntityType, behavior: BehaviorType) => spawn_cmd(player, entity, behavior),
	},
	set: {
		permissions: ["set"],
		arguments: () =>
			$tuple(
				args.players("players", "Set a player's data value"),
				QuickRegisterConchType(Object.keys(INITIAL_DATA), "key", "The data-type to set"),
				args.any("value", "The value to set"),
			),
		callback: (players: Player[], key: keyof PlayerData, value: unknown): void => set_cmd(players, key, value),
	},
	teleport: {
		permissions: ["teleport"],
		arguments: () =>
			$tuple(
				args.players("players", "The player(s) being teleported"),
				args.player("toPlayer", "The player the first player(s) is teleporting to"),
				args.optional(
					args.vector("offset", "Optional Offset the first player(s) will spawn from the second player"),
				),
			),
		callback: (players: Player[], player: Player, offset: Vector3): void => teleport_cmd(players, player, offset),
	},
	toggle_debug: {
		permissions: ["toggle_debug"],
		arguments: () =>
			$tuple(
				args.players("players", "The player whose data to set"),
				args.booleans("enabled", "Whether to enable or disable debugging"),
			),
		callback: (players: Player[], enableds: boolean[]): void => debug_cmd(players, enableds),
	},
	query: {
		permissions: ["query"],
		arguments: () =>
			$tuple(
				args.string(
					"query",
					"The query you want to send to the database. e.g 'CREATE TABLE PlayerData (id, name, score)",
				),
			),
		callback: (query: string): void => query_cmd(query).expect(),
	},
};
