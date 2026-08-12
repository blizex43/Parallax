import { Service } from "@flamework/core";
import { Janitor } from "@rbxts/janitor";
import { Players } from "@rbxts/services";
import { $warn } from "rbxts-transform-debug";
import type { OnPlayerLeave } from "serverstorage/hooks";
import { MarkForRemoval } from "shared/constants";
import { OnSignalSubscribed, SpawnTask } from "shared/decorators";
import type { OnCharacterAdd } from "shared/hooks";
@Service()
export class RespawnService implements OnCharacterAdd, OnPlayerLeave {
	private readonly currentRespawns: Map<CharacterModel, Promise<void>> = new Map();
	private readonly characterJanitors: Map<CharacterModel, Janitor> = new Map();
	private readonly respawnTime: number = 3;
	@SpawnTask()
	public onCharacterAdd(character: CharacterModel): void {
		let characterJanitor = this.characterJanitors.get(character);
		if (!characterJanitor) {
			characterJanitor = new Janitor();
			this.characterJanitors.set(character, characterJanitor);
		} else characterJanitor.Cleanup();
		const pendingRespawn = this.currentRespawns.get(character);
		const humanoid = character.Humanoid ?? character.WaitForChild("Humanoid");
		if (pendingRespawn && pendingRespawn.getStatus() === "Started") pendingRespawn.cancel();
		void characterJanitor.Add(
			humanoid.HealthChanged.Connect((health) => health === 0 && this.onMarkedForRespawn(character)),
		);
	}

	public onPlayerLeave(player: Player): void {
		for (const [character, janitor] of pairs(this.characterJanitors))
			if (Players.GetPlayerFromCharacter(character) === player) janitor.Cleanup();
	}

	@OnSignalSubscribed(MarkForRemoval)
	public onMarkedForRespawn(character: CharacterModel) {
		this.currentRespawns.set(
			character,
			new Promise<void>((resolve, reject) => {
				task.wait(this.respawnTime);
				if (!character) return reject(`Unable to resolve Character`);
				this.respawn(character);
				resolve();
			}).catch((reason: string) => $warn(reason)),
		);
	}

	private respawn(character: CharacterModel) {
		return Players.GetPlayerFromCharacter(character)?.LoadCharacterAsync();
	}
}
