import { Service } from "@flamework/core";
import { NestService } from "./nest";
import { isBasePart, isModel } from "shared/utility/t-isA";
import { OnSignalSubscribed, SpawnTask } from "shared/decorators";
import { NestDescendantChanged } from "shared/constants";
import { Hurtbox } from "serverstorage/components/hurtbox";
@Service()
export class HurtboxService {
	private readonly hurtboxes: Map<CharacterModel, Hurtbox> = new Map();
	constructor(private readonly nest: NestService) {}

	@OnSignalSubscribed(NestDescendantChanged)
	@SpawnTask()
	public onNestAdded(character: CharacterModel, nest: Folder, added: boolean) {
		if (nest !== this.nest.nest || !isModel(character)) return;
		if (added) this.setHurtbox(character);
		else this.destroyHurtbox(character);
	}

	public update(character: CharacterModel): void {
		const hurtbox = this.getHurtbox(character);
		if (hurtbox) hurtbox.updateHurtbox();
	}

	public getHurtbox(character: CharacterModel): Maybe<Hurtbox> {
		return this.hurtboxes.get(character);
	}

	public getCharacterFromHurtbox(instance: Hurtbox | BasePart): Maybe<CharacterModel> {
		for (const [character, hurtbox] of this.hurtboxes) {
			if (isBasePart(instance) && hurtbox.instance === instance) return character;
			if (!isBasePart(instance) && hurtbox === instance) return character;
		}
		return undefined;
	}

	private setHurtbox(character: CharacterModel) {
		this.hurtboxes.set(character, Hurtbox.create(character));
	}

	private destroyHurtbox(character: CharacterModel) {
		const hurtbox = this.getHurtbox(character);
		if (hurtbox) hurtbox.onDestroy();
		this.hurtboxes.delete(character);
	}
}
