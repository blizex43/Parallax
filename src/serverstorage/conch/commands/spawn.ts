import { Dependency } from "@flamework/core";
import { $warn } from "rbxts-transform-debug";
import { NpcService } from "serverstorage/services/npc";
import Log from "shared/log";
import type { BehaviorType, EntityType } from "shared/structs/npc";
import { capitalize } from "shared/utility/strings";
let npcService: NpcService;
export = function (player: Player, entity: EntityType, behavior: BehaviorType): void {
	try {
		npcService ??= Dependency<NpcService>();
		const character = <Maybe<CharacterModel>>player.Character;
		if (!character || !character.FindFirstChild("HumanoidRootPart")) {
			return Log.fatal(
				`Ran into an error spawning the NPC of the preset '${entity}', (Couldn't find character.)`,
			);
		}

		const position = character.HumanoidRootPart.Position;
		const response = npcService.create({
			Type: behavior,
			Position: position,
		});
		if (!response) {
			return Log.fatal(`Ran into an error spawning the NPC '${entity}' (Construction Problem.)`);
		}
		response.component.parentToNest();
		response.ai.fsm?.Start();
		Log.info(`Spawned ${capitalize(response.model.Name)} at ${player.Name}`);
	} catch (e) {
		$warn(e);
	}
};
