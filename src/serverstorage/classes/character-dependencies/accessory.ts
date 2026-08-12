import type { PlayerData } from "shared/data-models/player-data";
import { CharacterDependency } from "shared/structs/linked-dependency";
import { promisifyEvent } from "shared/utility/promises";

export class AccessoryDependency implements CharacterDependency {
	public readonly priority: number = 5;
	async onWrite(player: Player, _: PlayerData, character: CharacterModel): Promise<void> {
		if (!player.HasAppearanceLoaded())
			await promisifyEvent<[character: CharacterModel]>(player.CharacterAppearanceLoaded);
		task.defer(() => {
			this.removeAllAccessories(character.Humanoid);
			this.removeOthers(character);
		});
	}

	private removeAllAccessories(humanoid: Humanoid): void {
		humanoid.RemoveAccessories();
	}
	private removeOthers(character: CharacterModel): void {
		character.Head.Mesh.TextureId = "";
	}
}
