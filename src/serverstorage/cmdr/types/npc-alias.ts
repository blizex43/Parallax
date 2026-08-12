import type { Registry } from "@rbxts/cmdr";
import Object from "@rbxts/object-utils";
import { AISharedBlackboardNames } from "shared/enums/sharable-ai-enum";
import type { AIPresetName } from "shared/structs/ai";
import { makeFuzzyFinder } from "shared/utility/cmdr";
const PSUEDO_KEYS = () => {
	const keys: string[] = [];
	for (const key of Object.values(AISharedBlackboardNames)) {
		keys.push(key);
	}
	return keys;
};
const findAlias = makeFuzzyFinder(PSUEDO_KEYS());
export = function (registry: Registry): void {
	registry.RegisterType("npc", {
		Transform: (text: string) => findAlias(text),
		Validate: (keys: unknown) => {
			if ((<AIPresetName[]>keys).size() > 0) return true;
			return $tuple(false, "No matching aliases found.");
		},
		Autocomplete: (keys) => <string[]>keys,
		Parse: (keys) => (<string[]>keys)[0],
	});
};
