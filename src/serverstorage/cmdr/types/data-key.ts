import type { Registry } from "@rbxts/cmdr";
import Object from "@rbxts/object-utils";
import { INITIAL_DATA, PlayerDataKeys } from "shared/data-models/player-data";
import { makeFuzzyFinder } from "shared/utility/cmdr";
const DATA_KEYS = Object.keys(INITIAL_DATA);
const findKey = makeFuzzyFinder(DATA_KEYS);
export = function (registry: Registry): void {
	registry.RegisterType("dataKey", {
		Transform: (text: string) => findKey(text),
		Validate: (keys: unknown) => {
			if ((<PlayerDataKeys[]>keys).size() > 0) return true;
			return $tuple(false, "No matching data key found.");
		},
		Autocomplete: (keys) => <string[]>keys,
		Parse: (keys) => (<string[]>keys)[0],
	});
};
