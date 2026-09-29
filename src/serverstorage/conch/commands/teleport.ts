import { Dependency } from "@flamework/core";
import { $warn } from "rbxts-transform-debug";
import type { TeleportService } from "serverstorage/services/teleport";
import Log from "shared/log";

let teleportService: TeleportService;
export = function (players: Player[], toPlayer: Player, offset: Vector3): void {
	try {
		teleportService ??= Dependency<TeleportService>();
		print(offset);
		for (const player of players) {
			const response = teleportService.ingameTeleport(player, toPlayer, offset);
			if (response) Log.info(`Successfully teleported ${player.Name} towards ${toPlayer.Name}!`);
			else Log.fatal(`Failed to teleport ${player.Name} towards ${toPlayer.Name}.`);
		}
	} catch (e) {
		$warn(e);
	}
};
