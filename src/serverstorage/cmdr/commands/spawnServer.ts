import type { CommandContext } from "@rbxts/cmdr";
import { Dependency } from "@flamework/core";
import { $warn } from "rbxts-transform-debug";
import { capitalize } from "shared/utility/strings";
import { AIPresetName } from "shared/structs/ai";
import { NpcService } from "serverstorage/services/npc";

export = (context: CommandContext, player: Player, npcName: AIPresetName, offset: Vector3): void => {
	try {
		const character = <Maybe<CharacterModel>>player.Character;
		if (!character || !character.FindFirstChild("HumanoidRootPart")) {
			context.Reply(
				`Ran into an error spawning the NPC of the preset '${npcName}', (Couldn't find character.)`,
				Color3.fromRGB(255, 0, 0),
			);
			return;
		}
		const npcService = Dependency<NpcService>();
		const position = character.HumanoidRootPart.Position.add(offset);
		const response = npcService.create({
			Type: npcName,
			Position: position,
		});
		if (!response) {
			context.Reply(
				`Ran into an error spawning the NPC '${npcName}' (Construction Problem.)`,
				Color3.fromRGB(255, 0, 0),
			);
			return;
		}
		response.component.parentToNest();
		response.ai.fsm?.Start();
		context.Reply(`Spawned ${capitalize(response.model.Name)} at ${player.Name}`, Color3.fromRGB(0, 255, 0));
	} catch (e) {
		$warn(e);
	}
};
