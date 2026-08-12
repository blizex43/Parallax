import type { CommandContext } from "@rbxts/cmdr";
import { Dependency } from "@flamework/core";
import { $warn } from "rbxts-transform-debug";
import { TeleportService } from "serverstorage/services/teleport";

export = function (context: CommandContext, players: Player[], toPlayer: Player, offset: Vector3): void {
	try {
		const teleportService = Dependency<TeleportService>();
		print(offset);
		for (const player of players) {
			const response = teleportService.ingameTeleport(player, toPlayer, offset);
			if (response)
				context.Reply(`Successfully teleported ${player.Name} towards ${toPlayer.Name}!`, new Color3(0, 1, 0));
			else context.Reply(`Failed to teleport ${player.Name} towards ${toPlayer.Name}.`, new Color3(1, 0, 0));
		}
	} catch (e) {
		$warn(e);
	}
};
