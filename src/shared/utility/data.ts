import ColorUtils from "@rbxts/colour-utils";
import { isColor3, isString } from "./t-isA";
import { INITIAL_DATA, type PlayerData } from "shared/data-models/player-data";
import { stringHas } from "./strings";

export function formatToGame(data: Writable<PlayerData>): Writable<PlayerData> {
	for (const [name, defaultValue] of pairs(INITIAL_DATA)) {
		const value = data[name];

		if (isColor3(defaultValue)) {
			if (isColor3(value)) continue;
			if (stringHas(name.lower(), "color") && isString(value)) {
				data[<"hairColor">name] = ColorUtils.Hex.fromHex(value);
				continue;
			}
			data[name] = <never>defaultValue;
			continue;
		}

		if (typeOf(value) !== typeOf(defaultValue)) data[name] = <never>defaultValue;
	}
	return data;
}

export function formatToFirebase(data: Writable<PlayerData>) {
	for (const [name, value] of pairs(data)) {
		if (isColor3(value)) data[<"firstName">name] = ColorUtils.Hex.toHex(value);
	}
	return data;
}
