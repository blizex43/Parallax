import { isColor3, isNativeDataType, isObject, isString, isVector, objectSize } from "./t-isA";
import { tovector, vectortostring } from "./vector";
import { color3tostring, tocolor3 } from "./color";
import { toobject } from "./object";
import { toboolean } from "./boolean";
export function formatToGame(data: Record<string, unknown>): Record<string, unknown> {
	// eslint-disable-next-line prefer-const
	for (let [key, value] of pairs(data)) {
		value = basicDataDecrypt(value);
		data[key] = value;
	}
	return data;
}

export function formatToDatabase(data: Record<string, unknown>): Record<string, unknown> {
	// eslint-disable-next-line prefer-const
	for (let [key, value] of pairs(data)) {
		value = basicDataEncrypt(value);
		if (!isNativeDataType(value)) continue;
		data[key] = value;
	}
	return data;
}

export function basicDataEncrypt<T>(value: unknown): T {
	if (isObject(value) && objectSize(value) > 0) {
		value = formatToDatabase(<Record<string, unknown>>value);
	} else if (isObject(value)) {
		value = "{}";
	} else if (isVector(value)) {
		value = vectortostring(value);
	} else if (isColor3(value)) {
		value = color3tostring(value);
	} else if (isString(value)) {
		value = tostring(value);
	}

	return <T>value;
}

export function basicDataDecrypt<T>(value: unknown): T {
	const objected = toobject(value);
	if (objected && objectSize(objected) > 0) {
		value = formatToGame(<Record<string, unknown>>value);
	} else if (objected) {
		value = objected;
	} else if (isString(value)) {
		const vectored = tovector(value);
		if (vectored) value = vectored;
		const colored = tocolor3(value);
		if (colored) value = colored;
		const numbered = tonumber(value);
		if (numbered) value = numbered;
		const booleaned = toboolean(value);
		if (booleaned) value = booleaned;
	}

	return <T>value;
}
