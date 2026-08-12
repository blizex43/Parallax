/**
 * @description A utility function that converts a value to a boolean if possible. If the value is a string, it will return true for "true" and false for "false". If the value is a number, it will return true for 1 and false for 0. If the value cannot be converted to a boolean, it will return undefined.
 * @param value The value to convert to a boolean.
 * @returns A boolean if the value can be converted to a boolean, otherwise undefined.
 */
export function toboolean(value: unknown): Maybe<boolean> {
	if (typeOf(value) === "string") {
		if ((<string>value).lower() === "true") return true;
		else if ((<string>value).lower() === "false") return false;
		return;
	} else if (typeOf(value) === "number") {
		if (value === 1) return true;
		else if (value === 0) return false;
		return;
	} else if (typeOf(value) === "boolean") {
		return <boolean>value;
	}
	return;
}
