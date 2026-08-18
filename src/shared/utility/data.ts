import { isColor3, isNativeDataType, isObject, isString, isVector } from "./t-isA";
import { tovector, vectortostring } from "./vector";
import { color3tostring, tocolor3 } from "./color";
export function formatToGame(data: Record<string, unknown>): Record<string, unknown> {
	for (const [key, value] of pairs(data)) {
		if (isObject(value)) {
			data[key] = formatToGame(<Record<string, unknown>>value);
			continue;
		}
		const vectored = tovector(value);
		if (vectored) {
			data[key] = vectored;
		}
		const colored = tocolor3(value);
		if (colored) {
			data[key] = colored;
			continue;
		}
		if (!isNativeDataType(value)) continue;
		data[key] = value;
	}
	return data;
}

export function formatToDatabase(data: Record<string, unknown>): Record<string, unknown> {
	for (const [key, value] of pairs(data)) {
		if (isObject(value)) {
			data[key] = formatToDatabase(<Record<string, unknown>>value);
			continue;
		}
		if (isVector(value)) {
			data[key] = vectortostring(value);
		}
		if (isColor3(value)) {
			data[key] = color3tostring(value);
			continue;
		}
		if (isString(value)) {
			data[key] = tostring(value);
			continue;
		}
		if (!isNativeDataType(value)) continue;
		data[key] = value;
	}
	return data;
}
