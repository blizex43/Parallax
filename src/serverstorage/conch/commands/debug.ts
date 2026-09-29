import { Dependency } from "@flamework/core";
import { $warn } from "rbxts-transform-debug";
import type { DebugService } from "serverstorage/services/debug";
import Log from "shared/log";

let debugService: DebugService;
export = function (players: Player[], enableds: boolean[]): void {
	try {
		debugService ??= Dependency<DebugService>();
		for (const [i, player] of pairs(players)) {
			const previous = debugService.isParticipant(player);
			const enabled = enableds[i] ?? enableds[0];
			if (enabled) debugService.setParticipant(player);
			else debugService.delParticipant(player);
			Log.info(`Changed ${player.Name}'s debugging status from ${previous} to ${enabled}`);
		}
	} catch (e) {
		$warn(e);
	}
};
