import { Dependency } from "@flamework/core";
import { Players } from "@rbxts/services";
import { PlayerData } from "shared/data-models/player-data";
import { ReplicaController } from "./controllers/replica";

export const Player = Players.LocalPlayer;
export const PlayerGui = Player.WaitForChild<PlayerGui>("PlayerGui");
export function luaGetPlayerData(force: boolean = true, resolution: number = 0.3): Maybe<PlayerData> {
	let replica = Dependency<ReplicaController>();
	if (!replica && !force) return;
	if (!replica)
		do {
			task.wait(resolution);
			replica = Dependency<ReplicaController>();
		} while (!replica);
	if (!replica.initialized) return replica.waitForDataSignal().expect();
	return replica.getData();
}
export function getReplicaController() {
	return Dependency<ReplicaController>();
}
