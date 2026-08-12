import { trim } from "@rbxts/string-utils";
import type { DatastoreSQLConfig } from "../typings/rosql-types";
import { toboolean } from "shared/utility/boolean";
import { errorFormat } from "./logger";

export function readDotEnv<T extends object>(file: string, ref: T): Partial<DatastoreSQLConfig> {
	return validateDotEnv(parseDotEnv(file), ref);
}

export function validateDotEnv<T extends object>(env: Record<string, string>, ref: T): T {
	const mappedEnv: Record<string, string> = {};

	for (const [key, value] of pairs(env)) mappedEnv[key.lower()] = value;

	const newEnv = <Record<string, unknown>>{};
	print(mappedEnv);
	for (const [key, expectedValue] of pairs(<Record<string, unknown>>ref)) {
		const normalizedKey = key.lower();
		if (!(normalizedKey in mappedEnv)) throw errorFormat(`Missing key "${key}" in .env file.`);
		const value = mappedEnv[normalizedKey];
		const expectedType = typeOf(expectedValue);
		const realValue = transformDotEnvValue(value, expectedType);
		const actualType = typeOf(realValue);

		if (actualType !== expectedType)
			throw errorFormat(`Invalid value type for ${key}. Expected ${expectedType}, got ${actualType}`);

		newEnv[key] = realValue;
	}

	return <T>newEnv;
}

export function transformDotEnvValue<T>(value: string, typeofValue: keyof CheckableTypes): Maybe<T> {
	switch (typeofValue) {
		case "string":
			return <T>value;
		case "number":
			return <T>tonumber(value);
		case "boolean":
			return <T>toboolean(value);
		default:
			return undefined;
	}
}

export function parseDotEnv(file: string): Record<string, string> {
	[file] = file.gsub("_", "");
	const lines = file.split("\n");
	const env: Record<string, string> = {};
	for (const line of lines) {
		const [key, value] = line.split("=");
		if (key && value) {
			env[trim(key)] = trim(value);
		}
	}
	return env;
}
