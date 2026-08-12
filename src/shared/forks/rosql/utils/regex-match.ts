import { sha256 } from "@rbxts/hashlib";
import { HttpService as http } from "@rbxts/services";
import type {
	ConditionalSymbolsType,
	ConditionalTableType,
	DecodedNativeObjectType,
	RoSQLNativeTypesType,
	RoSQLQueryCommandsType,
} from "../typings/rosql-types";
import { stripQuotes, stripWhitespace } from "shared/utility/strings";
import { errorFormat } from "./logger";

export function appendWithSha256() {
	return sha256(http.GenerateGUID(false));
}

export function encodeNativeType(native: RoSQLNativeTypesType, nativeParameters: string[], input: string = ""): string {
	return `${input} <rosql>t=${native} p=${nativeParameters.isEmpty() ? "null" : nativeParameters.reduce((accum, current) => `${accum}${current},`)}</rosql>`;
}

export function extractParentheses(input: string): string[] {
	const match = input.match("%((.-)%)");
	if (match.isEmpty()) return [];
	return (<string>match[0])!.split(",").filter((p) => p !== "");
}

export function decodeNativeType(encoded: string): Maybe<DecodedNativeObjectType> {
	const match = encoded.match("<rosql>t=(%w+)%s+p=([%w,]+)</rosql>");
	if (match.isEmpty()) return;
	const [native, parameterString] = <[RoSQLNativeTypesType, string]>(<unknown>match);

	return {
		native,
		parameters: parameterString.split(",").filter((p) => p !== ""),
	};
}

export function stripParentheses(input: string): string {
	return stripWhitespace(input.gsub("%b()", "")[0] ?? input);
}

export function extractParenthesesParametersString(input: string): Maybe<string> {
	return <string>input.match("%((.-)%)")?.[0];
}

export function isolateParametersString(parameters: string): string[] {
	return stripWhitespace(parameters).split(",");
}

export function parseConditions(
	conditionsString: string,
	stripStringQuotes: boolean = true,
): Record<string, ConditionalTableType> {
	const conditions: Record<string, ConditionalTableType> = {};

	for (const clause of conditionsString.split("AND")) {
		const match = clause.match("(%w+)%s*(%S+)%s*'?(.-)'?$");
		if (!match.isEmpty()) {
			const [key, symbol, value] = match;
			conditions[tostring(key)] = {
				value: stripStringQuotes ? stripQuotes(tostring(value)) : tostring(value),
				symbol: <ConditionalSymbolsType>tostring(symbol),
			};
		}
	}
	if (next(conditions).isEmpty()) throw errorFormat("Failed to parse conditions: No valid key-value pairs found.");
	return conditions;
}

export function getMainQueryCommand(query: string): RoSQLQueryCommandsType {
	const [command] = query.match("^(%w+)")!;
	return <RoSQLQueryCommandsType>(command ? (<string>command).upper() : "");
}
