import { objectSize } from "shared/utility/t-isA";
import { allowedConditionalOperations, allowedSQLKeywords } from "../enums";
import type {
	ConditionalOperationsType,
	ConditionalTableType,
	DataFileType,
	RoSQLKeywordsTreeType,
	RoSQLKeywordsType,
	RoSQLNativeTypesType,
	ROSQLOptionsArchitecture,
} from "../typings/rosql-types";
import {
	appendKeywordToMetaData,
	appendNativeTypeToMetaData,
	isRoSQLDataType,
	isRoSQLOperationSymbol,
	removeNativeTypeFromMetaData,
	validatedDataType,
} from "./functions";
import { errorFormat, infoFormat } from "./logger";
import { extractParentheses, stripParentheses } from "./regex-match";
import {
	isBoolean,
	isChar,
	isDate,
	isDateTime,
	isDecimal,
	isInteger,
	isSet,
	isTime,
	isTimestamp,
	isVarChar,
} from "./type-checker";
import { isEmptyString, stripWhitespace } from "shared/utility/strings";

export function qualifyOperation(
	operation: ConditionalOperationsType,
	index: string,
	indexArg: string,
	indexArg2: string,
): boolean {
	if (!allowedConditionalOperations.includes(operation) || !index) return false;
	const isDataType = isRoSQLDataType(indexArg);
	switch (operation) {
		case "MODIFY":
		case "ADD":
			if (!isDataType) return false;
			break;
		case "DROP":
			if (indexArg || indexArg2) return false;
			break;
		case "RENAME":
			if (indexArg !== "TO") return false;
			break;
	}
	return true;
}

export function qualifyKeyword(operation: RoSQLKeywordsType, index: string, indexArg: string): boolean {
	if (!allowedSQLKeywords.includes(operation) || isEmptyString(index) || isEmptyString(indexArg)) return false;
	switch (operation) {
		case "AUTO_INCREMENT":
			if (!isRoSQLOperationSymbol(index) || (!tonumber(indexArg) && indexArg !== "NULL")) return false;
			break;
	}
	return true;
}

export function isolateKeyword(keyword: string): [RoSQLKeywordsType, string[]] {
	const formattedKeyword = stripWhitespace(keyword);
	const parameters = extractParentheses(formattedKeyword);
	const isolated = stripParentheses(formattedKeyword);
	return [<RoSQLKeywordsType>isolated, parameters];
}

export function handleKeyword(
	metaData: ROSQLOptionsArchitecture,
	operation: RoSQLKeywordsType,
	index: string,
	operationParams: string[],
): void {
	switch (operation) {
		case "AUTO_INCREMENT":
			if (!appendKeywordToMetaData(metaData, operation, index)) {
				throw errorFormat(`Operation [${operation}] is not registered in the index [keywords]`);
			}
			break;
		case "PRIMARY_KEY":
			if (operationParams.isEmpty()) throw errorFormat(`Operation [${operation}]'s parameters are too low.`);
			if (!appendKeywordToMetaData(metaData, operation, index, operationParams[0], 1)) break;
	}
}

export function handleOperation(
	datas: DataFileType[],
	metaData: ROSQLOptionsArchitecture,
	operation: ConditionalOperationsType,
	index: string,
	indexArg: string,
	indexArg2: string,
): void {
	switch (operation) {
		case "ADD":
			appendNativeTypeToMetaData(metaData, index, <RoSQLNativeTypesType>indexArg);
			for (const data of datas) data[<never>index] = <never>"";
			break;
		case "MODIFY":
			appendNativeTypeToMetaData(metaData, index, <RoSQLNativeTypesType>indexArg);
			for (const data of datas) if (index in data) data[<never>index] = <never>"";
			break;
		case "DROP":
			removeNativeTypeFromMetaData(metaData, index);
			for (const data of datas) data[<never>index] = <never>undefined;
			break;
		case "RENAME": {
			for (const data of datas) {
				data[<never>indexArg2] = <never>(index in data ? data[<never>index] : undefined);
				data[<never>index] = <never>undefined;
				break;
			}
		}
	}
}

export function qualifyConditionalOperation(
	conditionalKey: string,
	conditionalTable: ConditionalTableType,
	data: Record<string, unknown>,
): boolean {
	const index = data[<never>conditionalKey];
	const value = conditionalTable.value;
	const indexNumber = tonumber(index);
	const valueNumber = tonumber(value);
	switch (conditionalTable.symbol) {
		case "=":
			return index === value || indexNumber === valueNumber;
		case "<":
			if (!indexNumber || !valueNumber) return false;
			return indexNumber < valueNumber;
		case ">":
			if (!indexNumber || !valueNumber) return false;
			return indexNumber > valueNumber;
		case "<=":
			if (!indexNumber || !valueNumber) return false;
			return indexNumber <= valueNumber;
		case ">=":
			if (!indexNumber || !valueNumber) return false;
			return indexNumber >= valueNumber;
		case "!=":
			return index !== value;
		default:
			return false;
	}
}

export function castMetadataFunctions(
	datas: Record<string, unknown>[],
	data: Record<string, unknown>,
	metadata: ROSQLOptionsArchitecture,
): void {
	const metadataRecord = <Record<string, unknown>>(<unknown>metadata);
	const keywordIndex = <string>(metadataRecord["keywordIndexName"] ?? "keywords");
	const functionTree = <Record<string, Record<string, string | undefined>>>(metadataRecord[keywordIndex] ?? {});
	for (const [functionName, functionStore] of pairs(functionTree)) {
		executeMetadataFunction(
			datas,
			data,
			<RoSQLKeywordsType>functionName,
			<Record<string, string>>(<unknown>functionStore),
		);
	}
}

export function executeMetadataFunction(
	datas: Record<string, unknown>[] | Record<string, Record<string, unknown>>,
	data: Record<string, unknown>,
	func: RoSQLKeywordsType,
	funcStore: Record<string, string>,
): void {
	switch (func) {
		case "AUTO_INCREMENT": {
			const storeSize = objectSize(datas) + 1;
			for (const [columnIndex, columnValue] of pairs(funcStore)) {
				const accumulation = tonumber(columnValue);
				if (!accumulation)
					throw errorFormat(
						`AUTO_INCREMENT function for column '${columnIndex}' has invalid accumulation value.`,
					);
				print(storeSize, accumulation);
				data[columnIndex] = tostring(<never>storeSize + accumulation);
				print("INCREMENTED");
			}
		}
	}
}

export function validateKeywordFunctionsFromMetadata(
	metadata: ROSQLOptionsArchitecture,
	record: Record<string, unknown>,
): [boolean, string] {
	const metadataRecord = <Record<string, unknown>>(<unknown>metadata);
	const keywordIndex = <string>(metadataRecord["keywordIndexName"] ?? "keywords");
	if (!(keywordIndex in metadataRecord)) return [true, infoFormat("")];
	const keywordTree = <RoSQLKeywordsTreeType>metadataRecord[keywordIndex];
	for (const [keyword, keywordData] of pairs(keywordTree))
		for (const [keywordHandle] of pairs(keywordData)) {
			switch (keyword) {
				case "AUTO_INCREMENT":
					break;
				case "PRIMARY_KEY":
					if (!(keywordHandle in record) || !record[keywordHandle] || record[keywordHandle] === "NULL")
						return [
							false,
							errorFormat(
								`Keyword '${keyword}' requires the column '${keywordHandle}' inside the record.`,
							),
						];
					break;
			}
		}
	return [true, infoFormat("")];
}

export function validateNativeTypeFromMetaData(
	metadata: ROSQLOptionsArchitecture,
	index: string,
	value: string,
): [boolean, string] {
	const metadataRecord = <Record<string, unknown>>(<unknown>metadata);
	const dataTypeIndex = <string>(metadataRecord["dataTypeIndexName"] ?? "data-type-allocation");
	const dataTypeTree = <Record<string, string>>(metadataRecord[dataTypeIndex] ?? {});
	if (!(dataTypeIndex in metadataRecord) || !(index in dataTypeTree) || value === "") return [true, infoFormat("")];

	const dataType = dataTypeTree[index];

	const nativeType = <RoSQLNativeTypesType>stripParentheses(dataType);
	if (!validatedDataType(nativeType)) return [false, errorFormat(`Unknown native type '${dataType}'.`)];

	const parameters = extractParentheses(dataType);
	const native = nativeType;

	switch (native) {
		case "INT":
			return isInteger(value) ? [true, infoFormat("")] : [false, errorFormat(`Expected INT.`)];

		case "DECIMAL": {
			const [size, precision] = parameters;
			const [numSize, numPrecision] = [tonumber(size), tonumber(precision)];
			const [integer, decimal] = value.split(".");
			if (!numSize || !numPrecision || integer.size() > numSize || (decimal && decimal.size() > numPrecision))
				return [false, errorFormat(`DECIMAL(${size}, ${precision}) exceeded maximum size or precision.`)];
			return isDecimal(value) ? [true, infoFormat("")] : [false, errorFormat(`Expected DECIMAL.`)];
		}

		case "STRING":
			return [true, infoFormat("")];

		case "BOOLEAN":
			return isBoolean(value) ? [true, infoFormat("")] : [false, errorFormat(`Expected BOOLEAN.`)];

		case "CHAR": {
			const length = tonumber(parameters[0]);
			if (!length) return [false, errorFormat("CHAR requires a length.")];

			return isChar(value, length)
				? [true, infoFormat("")]
				: [false, errorFormat(`CHAR(${length}) expected exactly ${length} characters.`)];
		}

		case "VARCHAR": {
			const length = tonumber(parameters[0]);
			if (!length) return [false, errorFormat("VARCHAR requires a length.")];

			return isVarChar(value, length)
				? [true, infoFormat("")]
				: [false, errorFormat(`VARCHAR(${length}) exceeded maximum length.`)];
		}

		case "SET":
			return isSet(value, parameters)
				? [true, infoFormat("")]
				: [false, errorFormat(`Value '${value}' is not in SET(${parameters.join(", ")}).`)];

		case "DATE":
			return isDate(value) ? [true, infoFormat("")] : [false, errorFormat("Expected DATE (YYYY-MM-DD).")];

		case "TIME":
			return isTime(value) ? [true, infoFormat("")] : [false, errorFormat("Expected TIME (HH:MM:SS).")];

		case "DATETIME":
			return isDateTime(value) ? [true, infoFormat("")] : [false, errorFormat("Expected DATETIME (ISO-8601).")];

		case "TIMESTAMP":
			return isTimestamp(value) ? [true, infoFormat("")] : [false, errorFormat("Expected TIMESTAMP (ISO-8601).")];
	}

	return [false, errorFormat(`Unsupported native type '${native}'.`)];
}

export function checkMatchCondition(conditions: Record<string, ConditionalTableType>, data: object): boolean {
	const record = <Record<string, unknown>>(<unknown>data);
	for (const [conditional_key, conditional_value] of pairs(conditions))
		if (conditional_key in record && qualifyConditionalOperation(conditional_key, conditional_value, record))
			return true;

	return false;
}
