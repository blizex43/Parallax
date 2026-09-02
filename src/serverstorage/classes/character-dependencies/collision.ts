import type { PlayerData } from "shared/data-models/player-data";
import { HumanoidRagdollProperties } from "shared/enums/ragdoll-enum";
import { CharacterDependency } from "shared/structs/linked-dependency";
import { Reconcile } from "shared/utility/instance";

export class CollisionDependency implements CharacterDependency {
	public readonly priority: number = 7;
	async onWrite(player: Player, playerData: PlayerData, character: CharacterModel): Promise<void> {
		const humanoid = character.Humanoid ?? character.WaitForChild("Humanoid");
		this.constructRagdollEntity(humanoid);
	}

	private constructRagdollEntity(humanoid: Humanoid) {
		Reconcile(humanoid, <Partial<Pick<Humanoid, keyof Humanoid>>>HumanoidRagdollProperties);
	}
}
