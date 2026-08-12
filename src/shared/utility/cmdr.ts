import { stringHas } from "./strings";

type NameLike = { Name: string };
type FuzzySet = Array<string> | Array<Instance> | Array<EnumItem> | Array<NameLike> | Instance | Enum;

/** Takes an array and flips its values into dictionary keys with value of true. */
export function makeDictionary<T extends string | number | symbol>(array: T[]): Record<T, true> {
	const dictionary = {} as Record<T, true>;
	for (const value of array) dictionary[value] = true;
	return dictionary;
}

/** Takes an array of instances and returns (array<names>, array<instances>) */
function transformInstanceSet<T extends NameLike>(instances: T[]): [string[], T[]] {
	const names: string[] = [];
	for (const instance of instances) names.push(instance.Name);
	return $tuple(names, instances);
}

/** Returns a function that is a fuzzy finder for the specified set or container. */
export function makeFuzzyFinder(setOrContainer: FuzzySet): (text: string, returnFirst?: boolean) => unknown {
	let names: string[] = [];
	let instances: unknown[] = [];

	if (typeOf(setOrContainer) === "Enum") {
		setOrContainer = (setOrContainer as Enum).GetEnumItems();
	}

	if (typeOf(setOrContainer) === "Instance") {
		[names, instances] = transformInstanceSet((setOrContainer as Instance).GetChildren());
	} else if (typeOf(setOrContainer) === "table") {
		const first = (setOrContainer as Array<unknown>)[0];
		if (
			typeOf(first) === "Instance" ||
			typeOf(first) === "EnumItem" ||
			(typeOf(first) === "table" && typeOf((first as NameLike).Name) === "string")
		) {
			[names, instances] = transformInstanceSet(setOrContainer as Array<NameLike>);
		} else if (typeOf(first) === "string") {
			names = setOrContainer as string[];
		} else if (first !== undefined) {
			error("makeFuzzyFinder only accepts tables of instances or strings.");
		} else {
			names = [];
		}
	} else {
		error("makeFuzzyFinder only accepts a table, Enum, or Instance.");
	}

	return (text: string, returnFirst?: boolean) => {
		const results: never[] = [];
		const textLower = text.lower();

		for (const [i, name] of pairs(names)) {
			const value = instances.size() > 0 ? instances[i] : name;
			const nameLower = name.lower();

			if (nameLower === textLower) {
				if (returnFirst) return value;
				results.push(<never>value);
			} else {
				const start = stringHas(nameLower, textLower);
				if (start) results.push(<never>value);
			}
		}

		if (returnFirst) return results[0];
		return results;
	};
}

/** Takes an array of instances and returns an array of those instances' names. */
export function getNames(instances: Array<Instance | EnumItem | NameLike>): string[] {
	const names: string[] = [];
	for (const instance of instances) {
		const name = (instance as NameLike).Name;
		names.push(name !== undefined ? name : tostring(instance));
	}
	return names;
}

/** Makes an Enum type for Cmdr-style validation/autocomplete/parse. */
export function makeEnumType(name: string, values: string[]) {
	const findValue = makeFuzzyFinder(values);
	return {
		Validate: (text: string) =>
			$tuple(findValue(text, true) !== undefined, `Value "${text}" is not a valid ${name}.`),
		Autocomplete: (text: string) => {
			const list = findValue(text) as unknown[];
			return typeOf(list[0]) !== "string" ? getNames(list as Array<NameLike>) : (list as string[]);
		},
		Parse: (text: string) => findValue(text, true),
	};
}
