import { Service } from "@flamework/core";
import LazyIterator from "@rbxts/lazy-iterator";
import { Workspace as World } from "@rbxts/services";
import { NestDescendantChanged } from "shared/constants";
import { OnSignalSubscribed } from "shared/decorators";
import { Create } from "shared/utility/instance";
import { isModel } from "shared/utility/t-isA";
const { randomseed, random } = math;
@Service()
export class SpawnService {
	public readonly seed = randomseed(1000);
	constructor() {}
	@OnSignalSubscribed(NestDescendantChanged)
	public onNestValidated(character: CharacterModel, nest: Folder, on: boolean) {
		if (!on || !isModel(character)) return;
		const root = character.HumanoidRootPart;
		const location = this.getSpawnLocation();
		root.CFrame = location.CFrame.mul(new CFrame(new Vector3(0, 5, 0)));
	}

	private getSpawnLocation(): Part {
		const folder = World.Spawns ?? Create("Folder", "Spawns", World);
		return this.getRandomizedLocation(folder);
	}

	private getRandomizedLocation(folder: Folder): Part {
		const children = LazyIterator.fromArray(folder.GetChildren<Part>()).collect();
		if (children.size() === 0)
			children.push(
				Create("Part", "Part", folder, (part) => {
					part.Transparency = 0;
					part.CanCollide = false;
				}),
			);
		return children[random(0, children.size() - 1)];
	}
}
