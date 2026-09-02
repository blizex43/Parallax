import { HttpService as http } from "@rbxts/services";
import { endsWith, startsWith } from "@rbxts/string-utils";
import { isObject, isString } from "shared/utility/t-isA";
export abstract class JSON {
	/*
	 * @description A utility function that converts a value to a JSON string if possible. If the value is an object, it will return the JSON string representation of the object. If the value is not an object, it will return undefined.
	 * @param value The value to convert to a JSON string.
	 * @returns A JSON string if the value can be converted to a JSON string, otherwise undefined.
	 */
	public static encode(value: unknown): Maybe<string> {
		if (isObject(value)) {
			return http.JSONEncode(value);
		}
		return;
	}

	/*
	 * @description A utility function that converts a JSON string to an object if possible. If the value is a string that can be parsed as JSON, it will return the parsed object. If the value is a string that cannot be parsed as JSON, it will return undefined.
	 * @param value The JSON string to convert to an object.
	 * @returns An object if the value can be converted to an object, otherwise undefined.
	 */
	public static decode(value: unknown): Maybe<object> {
		if (isJsonString(value)) {
			const parsed = http.JSONDecode(value);
			if (isObject(parsed)) {
				return parsed;
			}
			return;
		}
		return;
	}
	/*
	 * @description A utility function that checks if a value can be converted to a JSON string. If the value is an object, it will return true. If the value is not an object, it will return false.
	 * @param value The value to check.
	 * @returns True if the value can be converted to a JSON string, otherwise false.
	 */
	public static canEncode(value: unknown): value is object {
		return isObject(value);
	}

	/*
	 * @description A utility function that checks if a value can be converted to an object. If the value is a string that can be parsed as JSON, it will return true. If the value is a string that cannot be parsed as JSON, it will return false.
	 * @param value The value to check.
	 * @returns True if the value can be converted to an object, otherwise false.
	 */
	public static canDecode(value: unknown): value is string {
		if (isJsonString(value)) {
			const parsed = http.JSONDecode(value);
			return isObject(parsed);
		}
		return false;
	}
}
export function isJsonString(value: unknown): value is string {
	if (
		isString(value) &&
		(startsWith(value, "{") || startsWith(value, "[")) &&
		(endsWith(value, "}") || endsWith(value, "]"))
	)
		return true;
	return false;
}
