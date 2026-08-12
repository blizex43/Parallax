import { Service } from "@flamework/core";
import { isPlayer } from "shared/utility/t-isA";
import { Locator } from "serverstorage/components/locator";
import { OnCharacterAdd, OnCharacterRemove } from "shared/hooks";

@Service()
export class TeleportService implements OnCharacterAdd, OnCharacterRemove {
	private readonly locators: Map<CharacterModel, Locator> = new Map();

	public onCharacterAdd(character: CharacterModel): void {
		this.locators.set(character, Locator.create(character));
	}

	public onCharacterRemove(character: CharacterModel): void {
		this.locators.delete(character);
	}

	public ingameTeleport(
		obj: Player | CharacterModel,
		toObj: Player | CharacterModel,
		offset: Vector3 = new Vector3(),
	): boolean {
		if (isPlayer(obj)) obj = <CharacterModel>obj.Character;
		if (isPlayer(toObj)) toObj = <CharacterModel>toObj.Character;
		if (!obj || !toObj) return false;
		const objLocator = this.getLocator(obj);
		if (!objLocator) return false;
		const targetPos = toObj.HumanoidRootPart.Position.add(offset);
		const [rx, ry, rz] = obj.HumanoidRootPart.CFrame.ToEulerAnglesXYZ();
		const productCFrame = new CFrame(targetPos).mul(CFrame.Angles(rx, ry, rz));
		objLocator.teleport(productCFrame);
		return true;
	}

	public getLocator(character: CharacterModel): Maybe<Locator> {
		return this.locators.get(character);
	}
}
