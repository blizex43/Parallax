import LazyIterator from "@rbxts/lazy-iterator";
import { stringHas } from "./strings";
import { Players } from "@rbxts/services";

export function Create<T extends keyof CreatableInstances>(
	instanceClass: T,
	name?: string,
	parent?: Instance,
	callback?: (instance: CreatableInstances[T]) => void,
): CreatableInstances[T] {
	const object = new Instance(instanceClass);
	object.Name = name ? name : object.Name;
	if (callback) callback(object);
	object.Parent = parent;
	return object;
}

export function Reconcile<T extends object, K extends keyof T>(
	instance: T,
	values: Partial<Pick<T, K>>,
	check = true,
): T {
	for (const [propertyName, propertyValue] of pairs(values)) {
		if (check && !(<K>propertyName in instance)) continue;

		instance[<K>propertyName] = <T[K]>propertyValue;
	}

	return instance;
}

export function ReconcileUnadded<T extends object, K extends keyof T>(
	instance: T,
	instanceEnum: Partial<Pick<T, K>>,
): T {
	for (const [propertyName, propertyValue] of pairs(instanceEnum)) {
		if (<K>propertyName in instance) continue;
		instance[<K>propertyName] = <never>propertyValue;
	}
	return instance;
}

export function AutocompleteChildren(instance: Instance, name: string, lower: boolean = true): Instance[] {
	const exporting: Instance[] = [];
	for (const child of instance.GetChildren()) {
		const checkName = lower ? child.Name.lower() : child.Name;
		if (stringHas(checkName, lower ? name.lower() : name)) exporting.push(child);
	}
	return exporting;
}

export function getClosestPlayers(
	point: CharacterModel,
	range?: number,
	blacklist: CharacterModel[] = [],
	includeSelf: boolean = false,
): Player[] {
	const root = point.HumanoidRootPart;
	if (!root) return [];

	const origin = root.Position;
	const selfPlayer = Players.GetPlayerFromCharacter(point);

	let players = LazyIterator.fromArray(Players.GetPlayers());
	if (selfPlayer && !includeSelf && !blacklist.includes(point)) {
		players = players.filter((p) => p !== selfPlayer);
	}
	players = players.filter((player) => {
		const character = <Maybe<CharacterModel>>player.Character;
		if (!character || !character.HumanoidRootPart) return false;

		if (range !== undefined) {
			const distance = character.HumanoidRootPart.Position.sub(origin).Magnitude;
			return distance <= range;
		}

		return true;
	});
	players = players.sort((a, b) => {
		const charA = <CharacterModel>a.Character;
		const charB = <CharacterModel>b.Character;

		const distA = charA.HumanoidRootPart.Position.sub(origin).Magnitude;
		const distB = charB.HumanoidRootPart.Position.sub(origin).Magnitude;

		return distA < distB;
	});

	return players.collect();
}
