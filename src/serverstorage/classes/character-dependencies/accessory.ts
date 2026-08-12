import { Worker } from "shared/classes/worker";
import type { PlayerData } from "shared/data-models/player-data";
import type { CharacterDependency } from "shared/structs/linked-dependency";
import { isAccessory } from "shared/utility/t-isA";
const worker = new Worker("accessory_remover");

export class AccessoryDependency implements CharacterDependency {
	public readonly priority: number = 5;
	constructor() {
		worker.startJob(async (player: Player, character: CharacterModel) => {
			await this.waitForCharacterAppearance(player, character);
			task.defer(() => {
				this.removeOthers(character);
				this.removeAllAccessories(character.Humanoid);
			});
		});
	}
	async onWrite(player: Player, _: PlayerData, character: CharacterModel): Promise<void> {
		worker.add(player, character);
	}

	private removeAllAccessories(humanoid: Humanoid): void {
		humanoid.RemoveAccessories();
	}
	private removeOthers(character: CharacterModel): void {
		character.Head.Mesh.TextureId = "";
	}

	private async waitForCharacterAppearance(player: Player, character: CharacterModel): Promise<Model> {
		if (!player.HasAppearanceLoaded()) {
			player.CharacterAppearanceLoaded.Wait();
		}
		let lastAccessoryCount = -1;
		for (let i = 0; i < 10; i++) {
			const accessories = character.GetChildren().filter((instance) => isAccessory(instance));

			if (accessories.size() === lastAccessoryCount) {
				return character;
			}

			lastAccessoryCount = accessories.size();
			task.wait();
		}

		return character;
	}
}
