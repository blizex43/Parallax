import { startsWith } from "@rbxts/string-utils";
import { isObject, isString } from "./t-isA";
import { JSON as json } from "shared/classes/json";
export function getRandomArrayValue<T>(array: T[]): T {
	return array[math.random(1, array.size()) - 1];
}

/**
 * @description A utility function that converts a value to an object if possible. If the value is already an object, it will return the value. If the value is not an object, it will return undefined.
 * If the value is a string that can be parsed as JSON, it will return the parsed object. If the value is a string that cannot be parsed as JSON, it will return undefined.
 * @param
 * @returns
 */
export function toobject(value: unknown): Maybe<object> {
	if (isObject(value)) {
		return value;
	}
	if (json.canDecode(value)) {
		const parsed = json.decode(value);
		if (parsed) {
			return parsed;
		}
	}
	return;
}

export function isJsonString(value: unknown): value is string {
	if (
		isString(value) &&
		(startsWith(value, "{") || startsWith(value, "[")) &&
		(startsWith(value, "}") || startsWith(value, "]"))
	)
		return true;
	return false;
}
