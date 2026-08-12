export function isInteger(value: string): boolean {
	const number = tonumber(value);
	return number !== undefined && number % 1 === 0;
}

export function isDecimal(value: string): boolean {
	return tonumber(value) !== undefined;
}

export function isBoolean(value: string): boolean {
	return value === "true" || value === "false";
}

export function isChar(value: string, length: number): boolean {
	return value.size() === length;
}

export function isVarChar(value: string, length: number): boolean {
	return value.size() <= length;
}

export function isSet(value: string, parameters: string[]): boolean {
	return parameters.includes(value);
}

export function isDate(value: string): boolean {
	// YYYY-MM-DD
	return value.match("^(%d%d%d%d)%-(%d%d)%-(%d%d)$").size() > 0;
}

export function isTime(value: string): boolean {
	// HH:MM:SS
	return value.match("^(%d%d):(%d%d):(%d%d)$").size() > 0;
}

export function isDateTime(value: string): boolean {
	// YYYY-MM-DDTHH:MM:SSZ
	return value.match("^(%d%d%d%d)%-(%d%d)%-(%d%d)T(%d%d):(%d%d):(%d%d)Z$").size() > 0;
}

export function isTimestamp(value: string): boolean {
	return isDateTime(value);
}
