import { slice } from "@rbxts/string-utils";
import { isNull } from "./t-isA";

/**
 * Takes a slug-string and converts it into PascalCase
 */
export function slugToPascal(slug: string): string {
	return slug
		.split("-")
		.map((word) => word.sub(1, 1).upper() + slice(word, 1))
		.join("");
}

/**
 * Takes a string and converts it into spaced text
 */
export function toSpaced(camelCased: string): string {
	return camelCased.gsub("([a-z])([A-Z])", "%1 %2")[0].gsub("([A-Za-z])(%d)", "%1 %2")[0];
}

/**
 * Capitalizes the first letter of `text`
 */
export function capitalize(text: string): string {
	return text.gsub("^[a-z]", (s) => s.upper())[0];
}

/**
 * Decapitalizes the first letter of `text`
 */
export function decapitalize(text: string): string {
	return text.gsub("^[A-Z]", (s) => s.lower())[0];
}

/**
 * Removes all whitespace characters from `text`
 */
export function stripWhitespace(text: string): string {
	return text.gsub("%s+", "")[0];
}

/**
 * Removes all Quotation characters from `text`
 */
export function stripQuotes(text: string): string {
	return text.gsub("^'(.-)'$", "%1")[0];
}

/**
 * checks if test is an asset Id
 */
export function isAssetId(text: string): boolean {
	return stringHas(text, "rbxassetid://");
}

/**
 * Removes a pattern from string
 */
export function removePattern(text: string, pattern: string): string {
	return text.gsub(pattern, "")[0];
}

/**
 * Checks if test is an asset Id
 */
export function stringHas(text: string, pattern: string, startAt?: number): boolean {
	return !isNull(text.find(pattern, startAt)[0]);
}

/**
 * Checks a string is equal to '""'
 */
export function isEmptyString(text: string): boolean {
	return text === "";
}
