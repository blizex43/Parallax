import { Service } from "@flamework/core";
import { Players } from "@rbxts/services";
import { SpawnTask } from "shared/decorators";
import { isBasePart, isPlayer } from "shared/utility/t-isA";

@Service()
export class PartService {
	constructor() {}

	public ownerify(part: BasePart | BasePart[], owner?: CharacterModel | Maybe<Player>, duration?: number): void {
		owner = this.resolveOwner(owner);
		for (const basePart of this.resolvePart(part)) this.setOwner(basePart, owner);
		if (duration) task.delay(duration, () => this.ownerify(part, undefined));
	}
	@SpawnTask()
	public async ownerifyDescendants(instance: Instance, owner?: CharacterModel | Maybe<Player>, duration?: number) {
		owner = this.resolveOwner(owner);
		const descendants = instance.GetDescendants().filter((child) => isBasePart(child));
		this.ownerify([...descendants], owner, duration);
	}

	private resolveOwner(owner: CharacterModel | Maybe<Player>) {
		if (!isPlayer(owner)) owner = Players.GetPlayerFromCharacter(owner);

		return owner;
	}

	private resolvePart(part: BasePart | BasePart[]): BasePart[] {
		if (isBasePart(part)) part = [part];
		return part;
	}
	private setOwner(basePart: BasePart, owner: Maybe<Player>) {
		return this.canSet(basePart) && basePart.SetNetworkOwner(owner);
	}

	private canSet(basePart: BasePart): boolean {
		return basePart.CanSetNetworkOwnership()[0];
	}
}
