import { Service } from "@flamework/core";
import LazyIterator from "@rbxts/lazy-iterator";
import { ServerStorage } from "@rbxts/services";
import { AutocompleteChildren } from "shared/utility/instance";
import { isFolder } from "shared/utility/t-isA";

@Service()
export class ModelService {
	private readonly modelInventory = ServerStorage.Assets.Models;
	constructor() {}
	public getRandomDummy(index?: number): CharacterModel {
		const children = <CharacterModel[]>(
			this.modelInventory.QueryDescendants("#Dummies > Model, #Characters > Model")
		);
		return (index ? children[index] : children[math.random(1, children.size()) - 1]).Clone();
	}

	public get(name: string): Maybe<CharacterModel> {
		for (const modelFolder of this.modelInventory.GetChildren()) {
			if (!isFolder(modelFolder)) continue;
			const possibleModel = <Maybe<CharacterModel>>modelFolder.FindFirstChild(name);
			if (possibleModel) return possibleModel.Clone();
		}
		return;
	}

	public getAuto(name: string): CharacterModel[] {
		const exporting: LazyIterator<Instance> = LazyIterator.fromArray([]);
		for (const modelFolder of this.modelInventory.GetChildren()) {
			if (!isFolder(modelFolder)) continue;
			const possible = AutocompleteChildren(modelFolder, name);
			if (possible.size() > 0) exporting.append(...possible);
		}
		return <CharacterModel[]>exporting.collect();
	}
}
