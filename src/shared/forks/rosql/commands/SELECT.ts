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
		let data: Maybe<DataFileType[]>;
		const results: Record<string, unknown>[] = [];
		try {
			data = await manager.databaseMethods.get<DataFileType[]>(input.tableName);
			if (!data) return results;
		} catch (err) {
			throw errorFormat(`Failed to fetch data from DataStore\n${err}`);
		}
		for (const value of data) {
			let match: boolean = true;
			if (input.conditions && objectSize(input.conditions) > 0)
				match = checkMatchCondition(input.conditions, value);

			if (match) {
				// print("Found Match: ", value);
				const recordValue = <Record<string, unknown>>(<unknown>value);
				if (input.columns[0] === "*") results.push(manager.decryption(recordValue));
				else {
					const matchedResult: Record<string, unknown> = {};
					for (const [, column] of ipairs(input.columns))
						if (column in recordValue) matchedResult[column] = recordValue[column];
					results.push(manager.decryption(matchedResult));
				}
			}
		}

		return results;
	}

	public getMatch(query: string, pattern: string = this.pattern): string[] {
		return <string[]>[...query.match(pattern)];
	}
}
