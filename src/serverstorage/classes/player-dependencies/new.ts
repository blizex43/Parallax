import { Rerolled, RerollSignal } from "shared/constants";
import type { PlayerData } from "shared/data-models/player-data";
import { RollTypes } from "shared/enums/info-enum";
import { RollOptions, RollType } from "shared/structs/info";
import { PlayerDependency } from "shared/structs/linked-dependency";
import { promisifyEvent } from "shared/utility/promises";

export class NewDependency implements PlayerDependency {
	public readonly priority: number = 50;
	async onWrite(player: Player, playerData: Writable<PlayerData>): Promise<void> {
		const serverInit = playerData.serverInit;
		if (serverInit) return;
		print(serverInit, playerData);
		this.fireAllRollTypes(playerData);
		playerData.serverInit = true;
	}

	async onChanged(player: Player, playerData: PlayerData): Promise<void> {}

	private async fireAllRollTypes(playerData: PlayerData, yieldTo: boolean = true): Promise<void> {
		const fire = (playerData: PlayerData, rollType: RollType, options: RollOptions) =>
			RerollSignal.Fire(playerData, rollType, options);
		const exclude: RollOptions = <const>{ exclude: ["Legendary", "Mythic", "Random"] };
		for (const rollType of RollTypes) {
			fire(playerData, rollType, exclude);
		}
		if (yieldTo) await promisifyEvent(Rerolled);
	}
}
