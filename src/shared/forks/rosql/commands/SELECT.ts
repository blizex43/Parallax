import { stripWhitespace } from "shared/utility/strings";
import { errorFormat } from "../utils/logger";
import type { DataFileType, RoSQLQueryCommandsFunctions, SQLParsedReturns } from "../typings/rosql-types";
import { checkMatchCondition } from "../utils/parse";
import { objectSize } from "shared/utility/t-isA";
import { parseConditions } from "../utils/regex-match";
import { RoSQLManager } from "../manager";
export class SELECTQuery implements RoSQLQueryCommandsFunctions {
	constructor() {}
	public readonly pattern: string = "SELECT%s+(.-)%s+FROM%s+(%S+)%s+WHERE%s+(.+)";
	public readonly secondaryPattern: string = "SELECT%s+(.-)%s+FROM%s+(%S+)%s*$";
	public readonly matchThreshhold: number = 2;
	public parseArgs(query: string): Partial<SQLParsedReturns> {
		let matches = this.getMatch(query);
		let matchSize = matches.size();
		if (matchSize === 0) {
			matches = this.getMatch(query, this.secondaryPattern);
			matchSize = matches.size();
		}
		if (matchSize >= this.matchThreshhold) {
			const [columnsString, tableName, conditionStr] = matches;
			const columns = columnsString.split(",").map((column) => stripWhitespace(column));
			const conditions = conditionStr ? parseConditions(conditionStr) : {};
			return {
				tableName,
				columns,
				conditions,
			};
		} else
			throw errorFormat(
				`SELECT pattern did not match. Expected at least ${this.matchThreshhold} captures, got: ${matchSize}`,
			);
	}

	public async do(manager: RoSQLManager, input: SQLParsedReturns): Promise<unknown> {
		if (!manager.configuration.allowSelect) throw errorFormat(`SELECT is disabled.`);

		const results: Record<string, unknown>[] = [];
		const useFastIndexing = manager.configuration.allowEnforcePrimaryKeyForFastIndexing;

		const data = await manager.databaseMethods.get<Record<string, DataFileType>>(input.tableName).catch((err) => {
			throw errorFormat(`Failed to fetch data from DataStore\n${err}`);
		});
		if (!data) return results;
		if (useFastIndexing) {
			for (const [conditional_key, conditional_value] of pairs(input.conditions)) {
				if (
					conditional_key === manager.configuration.primaryKeyName &&
					conditional_value.symbol === "=" &&
					conditional_value.value in data
				) {
					delete input.conditions[conditional_key];
					// print("Successfully found record using fast indexing.");
					const recordValue = <Record<string, unknown>>data[conditional_value.value];
					if (input.columns[0] === "*") results.push(manager.decryption(recordValue));
					else {
						const matchedResult: Record<string, unknown> = {};
						for (const [, column] of ipairs(input.columns))
							if (column in recordValue) matchedResult[column] = recordValue[column];
						results.push(manager.decryption(matchedResult));
					}
					return results;
				}
			}
		}
		// Standard format: data is [{record}, {record}, ...]
		for (const [, value] of pairs(data)) {
			let match: boolean = true;
			if (input.conditions && objectSize(input.conditions) > 0)
				match = checkMatchCondition(input.conditions, value);

			if (match) {
				// print("Found Match: ", value);
				const recordValue = <Record<string, unknown>>value;
				if (input.columns[0] === "*") {
					results.push(manager.decryption(recordValue));
					break;
				} else {
					const matchedResult: Record<string, unknown> = {};
					for (const [, column] of ipairs(input.columns))
						if (column in recordValue) matchedResult[column] = recordValue[column];
					results.push(manager.decryption(matchedResult));
				}
			}
		}

		print(results);
		return results;
	}

	public getMatch(query: string, pattern: string = this.pattern): string[] {
		return <string[]>[...query.match(pattern)];
	}
}
