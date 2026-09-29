import { Dependency } from "@flamework/core";
import { $warn } from "rbxts-transform-debug";
import type { DataService } from "serverstorage/services/third-party/data";
import type { PlayerData } from "shared/data-models/player-data";
import Log from "shared/log";
import { capitalize } from "shared/utility/strings";
let dataService: DataService;
export = function (players: Player[], key: keyof PlayerData, value: unknown): void {
	try {
		dataService ??= Dependency<DataService>();
		for (const player of players) {
			const currentData = dataService.get(player);
			const typedData = currentData as Writable<PlayerData>;
			const originalValue = typedData[key];
			const originalType = typeOf(originalValue);
			const newType = typeOf(value);
			if (originalType !== newType) {
				return Log.fatal(`Type mismatch: expected ${originalType}, got ${newType}`);
			}
			typedData[key] = <never>value;
			dataService.set(player, typedData);
			Log.info(`Changed ${player.Name}'s ${capitalize(key)} to ${value}`);
		}
	} catch (e) {
		$warn(e);
	}
};
