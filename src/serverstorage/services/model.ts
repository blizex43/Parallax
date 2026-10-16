import { Service } from "@flamework/core";
import LazyIterator from "@rbxts/lazy-iterator";
import { ServerStorage } from "@rbxts/services";
import { AutocompleteChildren } from "shared/utility/instance";
import { isFolder } from "shared/utility/t-isA";

@Service()
export class ModelService {
	private readonly modelInventory = ServerStorage.Assets.Models;
	constructor() {}
	public getRandomDummy(clone: boolean = true, index?: number): CharacterModel {
		const children = <CharacterModel[]>(
			this.modelInventory.QueryDescendants("#Dummies > Model, #Characters > Model")
		);
		const dummy = index ? children[index] : children[math.random(1, children.size()) - 1];
		return clone ? dummy.Clone() : dummy;
	}

	public get(name: string, clone: boolean = true): Maybe<CharacterModel> {
		for (const modelFolder of this.modelInventory.GetChildren()) {
			if (!isFolder(modelFolder)) continue;
			const possibleModel = <Maybe<CharacterModel>>modelFolder.FindFirstChild(name);
			if (possibleModel) return clone ? possibleModel.Clone() : possibleModel;
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
