import type { CommandDefinition } from "@rbxts/cmdr";

export = identity<CommandDefinition>({
	Name: "spawn",
	Aliases: ["make"],
	Description: "Spawns A NPC infront of you.",
	Group: "Dev",
	Args: [
		{
			Type: "player",
			Name: "Player",
			Description: "The Player you want to spawn the NPC on",
		},
		{
			Type: "npc",
			Name: "NPC Type",
			Description: "The Type Of NPC you'd like to spawn in",
		},
		{
			Type: "vector3",
			Name: "Offset Spawn",
			Description: "The Offset spawn of the NPC you'd like to spawn",
			Optional: true,
			Default: new Vector3(),
		},
	],
});
