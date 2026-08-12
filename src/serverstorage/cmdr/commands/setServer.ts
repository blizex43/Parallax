import type { CommandContext } from "@rbxts/cmdr";
import { Dependency } from "@flamework/core";
import type { DataService } from "serverstorage/services/third-party/data";
import type { PlayerData, PlayerDataKeys } from "shared/data-models/player-data";
import { $warn } from "rbxts-transform-debug";
import { capitalize } from "shared/utility/strings";


export = function (context: CommandContext, players: Player[], key: PlayerDataKeys, value: unknown): void {
	try {
		const dataService = Dependency<DataService>();
		for (const player of players) {
			const currentData = dataService.get(player);
			const typedData = currentData as Writable<PlayerData>;
			const originalValue = typedData[key];
			const originalType = typeOf(originalValue);
			const newType = typeOf(value);
			if (originalType !== newType) {
				context.Reply(`Type mismatch: expected ${originalType}, got ${newType}`, Color3.fromRGB(255, 0, 0));
				return;
			}
			typedData[key] = <never>value;
			dataService.set(player, typedData);
			context.Reply(`Changed ${player.Name}'s ${capitalize(key)} to ${value}`, Color3.fromRGB(0, 255, 0));
		}
	} catch (e) {
		$warn(e);
	}
};
