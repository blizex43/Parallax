import type { CommandDefinition } from "@rbxts/cmdr";

export = identity<CommandDefinition>({
	Name: "debug",
	Aliases: ["fix", "@d"],
	Description: "Subscribes players to enter debugging phase",
	Group: "Dev",
	Args: [
		{
			Type: "players",
			Name: "Player",
			Description: "The player whose data to set",
		},
		{
			Type: "booleans",
			Name: "Enabled",
			Description: "Whether to enable or disable debugging",
		},
	],
});
