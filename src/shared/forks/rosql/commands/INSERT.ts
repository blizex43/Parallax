import { errorFormat, infoFormat } from "../utils/logger";
import type { RoSQLQueryCommandsFunctions, SQLParsedReturns } from "../typings/rosql-types";
import { stripQuotes, stripWhitespace } from "shared/utility/strings";
import {
	castMetadataFunctions,
	validateKeywordFunctionsFromMetadata,
	validateNativeTypeFromMetaData,
} from "../utils/parse";
import { RoSQLManager } from "../manager";

export class INSERTQuery implements RoSQLQueryCommandsFunctions {
	constructor() {}
	public readonly pattern: string = "^INSERT%s+INTO%s+([%w_]+)%s*%(([%w_,%s]+)%)%s*VALUES%s*%(([%w%s',.]+)%)$";
	public readonly matchThreshhold: number = 3;

	public parseArgs(query: string): Partial<SQLParsedReturns> {
		const matches = this.getMatch(query);
		const matchSize = matches.size();
		if (matchSize >= this.matchThreshhold) {
			const [tableName, columnsString, valuesString] = matches;
			const columns = columnsString.split(",").map((column) => stripWhitespace(column));
			const values = valuesString.split(",").map((value) => stripQuotes(stripWhitespace(value)));
			return {
				tableName,
				columns,
				values,
			};
		} else
			throw errorFormat(
				`INSERT pattern did not match. Expected at least ${this.matchThreshhold} captures, got: ${matchSize}`,
			);
	}

	public async do(manager: RoSQLManager, input: SQLParsedReturns): Promise<unknown> {
		if (!manager.configuration.allowInsert) throw errorFormat(`INSERT is disabled.`);
		if (input.columns.isEmpty() || input.values.isEmpty())
			throw errorFormat("INSERT query is missing columns or values.");
		if (input.columns.size() !== input.values.size())
			throw errorFormat("Number of columns and values do not match.");

		const record = <Record<string, string>>{};
		for (const [i, column] of ipairs(input.columns)) record[column] = input.values[i - 1];

		const useFastIndexing = manager.configuration.allowEnforcePrimaryKeyForFastIndexing;
		if (useFastIndexing && !(manager.configuration.primaryKeyName in record)) {
			throw errorFormat(
				`Fast indexing requires primary key '${manager.configuration.primaryKeyName}' in record. Cannot insert without primary key.`,
			);
		}

		await manager.databaseMethods.updateAsync<Record<string, unknown>[] | Record<string, unknown>>(
			input.tableName,
			(previous, metaData) => {
				if (!previous)
					if (manager.configuration.allowOverwrite) previous = useFastIndexing ? {} : [];
					else throw errorFormat("Table does not exist and overwrite is not allowed, so cannot insert data.");

				if (metaData) {
					for (const [column, value] of pairs(record)) {
						const [success, response] = validateNativeTypeFromMetaData(metaData, column, value);
						if (!success) throw response;
					}
					const [success, response] = validateKeywordFunctionsFromMetadata(metaData, record);
					if (!success) throw response;
					castMetadataFunctions(<Record<string, unknown>[]>(<unknown>previous), record, metaData);
				}

				if (useFastIndexing) {
					const fastIndexingRecord = <Record<string, unknown>>previous;
					fastIndexingRecord[manager.configuration.primaryKeyName] = record;
				} else {
					const arrayRecord = <Record<string, unknown>[]>(<unknown>previous);
					arrayRecord.push(<Record<string, unknown>>record);
				}

				return [previous];
			},
		);
		return infoFormat(`Record inserted into '${input.tableName}'.`);
	}

	public getMatch(query: string): string[] {
		return <string[]>[...query.match(this.pattern)];
	}
}
