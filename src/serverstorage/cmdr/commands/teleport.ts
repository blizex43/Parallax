import type { CommandDefinition } from "@rbxts/cmdr";

export = identity<CommandDefinition>({
	Name: "teleport",
	Aliases: ["tp", "tele"],
	Description: "Teleports the first player to the second player",
	Group: "Dev",
	Args: [
		{
			Type: "players",
			Name: "Player",
			Description: "The player(s) being teleported",
		},
		{
			Type: "player",
			Name: "To Player",
			Description: "The player the first player(s) is teleporting to",
		},
		{
			Type: "vector3",
			Name: "Offset",
			Description: "Optional Offset the first player(s) will spawn from the second player",
			Optional: true,
			Default: new Vector3(),
		},
	],
});
