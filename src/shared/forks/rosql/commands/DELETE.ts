import { errorFormat, infoFormat } from "../utils/logger";
import type { DataFileType, RoSQLQueryCommandsFunctions, SQLParsedReturns } from "../typings/rosql-types";
import { checkMatchCondition } from "../utils/parse";
import { objectSize } from "shared/utility/t-isA";
import { parseConditions } from "../utils/regex-match";
import { RoSQLManager } from "../manager";

export class DELETEQuery implements RoSQLQueryCommandsFunctions {
	constructor() {}
	public readonly pattern: string = "[[DELETE%s+FROM%s+(%S+)%s+WHERE%s+(.+)]]";
	public readonly matchThreshhold: number = 2;

	public parseArgs(query: string): Partial<SQLParsedReturns> {
		const matches = this.getMatch(query);
		const matchSize = matches.size();
		if (matchSize >= this.matchThreshhold) {
			const [tableName, conditionsString] = matches;
			const conditions = parseConditions(conditionsString);
			return {
				tableName,
				conditions,
			};
		} else
			throw errorFormat(
				`DELETE pattern did not match. Expected at least ${this.matchThreshhold} captures, got: ${matchSize}`,
			);
	}

	public async do(manager: RoSQLManager, input: SQLParsedReturns): Promise<unknown> {
		if (!manager.configuration.allowDelete) throw errorFormat(`DELETE is disabled.`);
		await manager.databaseMethods.updateAsync<DataFileType[]>(input.tableName, (previous) => {
			if (!previous) throw errorFormat(`Table '${input.tableName}' does not exist.`);
			const filtered = <DataFileType[]>[];
			for (const value of previous) {
				let matches = true;
				if (input.conditions && objectSize(input.conditions) > 0) {
					matches = checkMatchCondition(input.conditions, value);
				}
				if (!matches) filtered.push(value);
			}
			if (filtered.size() === previous.size()) throw errorFormat("No matching records found to delete.");
			if (filtered.size() === 0) throw errorFormat("All records deleted.");
			return [filtered];
		});
		return infoFormat(`Records deleted from '${input.tableName}'.`);
	}

	public getMatch(query: string): string[] {
		return <string[]>[...query.match(this.pattern)];
	}
}
