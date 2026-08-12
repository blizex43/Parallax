import type { CommandContext } from "@rbxts/cmdr";
import { Dependency } from "@flamework/core";
import type { DebugService } from "serverstorage/services/debug";
import { $warn } from "rbxts-transform-debug";

export = function (context: CommandContext, players: Player[], enableds: boolean[]): void {
	try {
		const debug = Dependency<DebugService>();
		for (const [i, player] of pairs(players)) {
			const previous = debug.isParticipant(player);
			const enabled = enableds[i] ?? enableds[0];
			if (enabled) debug.setParticipant(player);
			else debug.delParticipant(player);
			context.Reply(
				`Changed ${player.Name}'s debugging status from ${previous} to ${enabled}`,
				Color3.fromRGB(0, 255, 0),
			);
		}
	} catch (e) {
		$warn(e);
	}
};
