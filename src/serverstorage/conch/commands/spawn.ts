import { Dependency } from "@flamework/core";
import { $warn } from "rbxts-transform-debug";
import { NpcService } from "serverstorage/services/npc";
import Log from "shared/log";
import type { EntityCreationProperties, NPCPresetType } from "shared/structs/npc";
import { capitalize } from "shared/utility/strings";
import { isBasePart } from "shared/utility/t-isA";

let npcService: NpcService;

export = function (player: Player, preset: NPCPresetType): void {
	try {
		npcService ??= Dependency<NpcService>();
		const character = player.Character;
		const root = character?.FindFirstChild("HumanoidRootPart");
		if (!character || !isBasePart(root))
			return Log.fatal(`Cannot spawn NPC preset '${preset}': the player has no character root.`);

		const properties = getPresetProperties(preset, root.Position.add(root.CFrame.LookVector.mul(6)));
		const npc = npcService.create(properties);
		Log.info(`Spawned ${capitalize(npc.model.Name)} (${preset}) near ${player.Name}`);
	} catch (error) {
		$warn(error);
	}
};

function getPresetProperties(preset: NPCPresetType, position: Vector3): EntityCreationProperties {
	switch (preset) {
		case "blocking-dummy":
			return { entityIdentity: "dummy", behavior: "aggressive", statRange: "dummy", preset, position };
		case "light-attacker":
			return {
				entityIdentity: "dummy",
				behavior: "aggressive",
				statRange: "weak",
				preset,
				mastery: "normal",
				position,
			};
		case "heavy-attacker":
			return {
				entityIdentity: "dummy",
				behavior: "aggressive",
				statRange: "weak",
				preset,
				mastery: "normal",
				position,
			};
		case "low-intelligence":
			return {
				entityIdentity: "normal",
				preset,
				behavior: "aggressive",
				mastery: "easy",
				statRange: "weak-variant-basic",
				position,
			};
	}
	return Log.fatal(`Unknown NPC preset '${preset}'.`);
}
