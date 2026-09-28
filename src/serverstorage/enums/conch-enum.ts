import { args } from "@rbxts/conch";
import type { RegistryType } from "shared/structs/conch";
import { ConchBehaviorType, ConchEntityType } from "shared/enums/conch-types-enum";

export const ConchRegistry: RegistryType = {
	kick: {
		permissions: ["kick"],
		arguments: () =>
			$tuple(
				args.player("player", "The player you'd like to kick from the game"),
				args.string("reason", "The reason you are kicking this player from the game."),
			),
		callback: (player: Player, reason: string): void => player.Kick(reason),
	},
	spawn: {
		permissions: ["spawn"],
		arguments: () =>
			$tuple(
				args.overload([
					{
						arguments: [
							ConchEntityType("entity", "Spawn a non-sentient NPC"),
							ConchBehaviorType("behavior", "The Entity's Behavior"),
						],
						description: "Spawn an Entity into the game",
					},
				]),
			),
		callback: (...args: Array<unknown>) => {
			warn("Function not implemented.");
		},
	},
};
