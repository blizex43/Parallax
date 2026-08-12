import type { PlayerData } from "shared/data-models/player-data";
import type { AssetPacket } from "shared/structs/packets";

export interface OnDataUpdate {
	onDataUpdate(data: PlayerData): void;
}

export interface OnDataLoad {
	onDataLoad(data: PlayerData): void;
}

export interface OnAssetLoad {
	onAssetLoad(data: AssetPacket): void;
}
