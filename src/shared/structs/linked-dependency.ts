import type { PlayerData, PlayerDataKeys } from "shared/data-models/player-data";

export interface CharacterDependency {
	readonly priority: number;
	readonly changableKeys?: PlayerDataKeys[];
	onWrite(player: Player, playerData: PlayerData, character: CharacterModel): Promise<void>;
	onChanged?(player: Player, playerData: PlayerData): Promise<void>;
}

export interface PlayerDependency {
	readonly priority: number;
	onWrite(player: Player, playerData: PlayerData): Promise<void>;
	onChanged?(player: Player, playerData: PlayerData): Promise<void>;
}
