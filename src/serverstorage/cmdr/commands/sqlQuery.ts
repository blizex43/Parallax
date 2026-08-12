import type { CommandDefinition } from "@rbxts/cmdr";

export = identity<CommandDefinition>({
	Name: "rsql",
	Aliases: ["sql", "rsql", "@s"],
	Description: "Query the Database using the SQL language",
	Group: "Dev",
	Args: [
		{
			Type: "string",
			Name: "Query",
			Description: "The query you want to send to the database. e.g 'CREATE TABLE PlayerData (id, name, score)",
		},
	],
});
