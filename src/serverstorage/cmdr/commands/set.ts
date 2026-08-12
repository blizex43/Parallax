import type { CommandDefinition } from "@rbxts/cmdr";

export = identity<CommandDefinition>({
	Name: "set",
	Aliases: ["give", "pdata"],
	Description: "Set a player's data value",
	Group: "Dev",
	Args: [
		{
			Type: "players",
			Name: "Player",
			Description: "The player whose data to set",
		},
		{
			Type: "dataKey",
			Name: "Key",
			Description: "The data key to set",
		},
		{
			Type: "any",
			Name: "Value",
			Description: "The value to set",
		},
	],
});
