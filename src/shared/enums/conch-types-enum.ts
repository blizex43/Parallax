import * as Conch from "@rbxts/conch";
import { args } from "@rbxts/conch";
import { AIBehaviors, NPCEntitys } from "shared/enums/npc-enum";
type ConchTypeData = Parameters<typeof Conch.register_type>[1];

export const ConchEntityType = Conch.register_type(
	"entity",
	<ConchTypeData>(<unknown>args.enum_new(NPCEntitys, "entity", "Spawn a non-sentient NPC")),
);
export const ConchBehaviorType = Conch.register_type(
	"behavior",
	<ConchTypeData>(<unknown>args.enum_new(AIBehaviors, "behavior", "The Entity's Behavior")),
);
