import { errorFormat, infoFormat } from "../utils/logger";
import type { DataFileType, RoSQLQueryCommandsFunctions, SQLParsedReturns } from "../typings/rosql-types";
import { checkMatchCondition, validateNativeTypeFromMetaData } from "../utils/parse";
import { objectSize } from "shared/utility/t-isA";
import { parseConditions } from "../utils/regex-match";
import { RoSQLManager } from "../manager";

export class UPDATEQuery implements RoSQLQueryCommandsFunctions {
	constructor() {}
	public readonly pattern: string = "UPDATE%s+(%S+)%s+SET%s+(.-)%s*WHERE%s*(.+)";
	public readonly matchThreshhold: number = 3;

	public parseArgs(query: string): Partial<SQLParsedReturns> {
		const matches = this.getMatch(query);
		const matchSize = matches.size();
		if (matchSize >= this.matchThreshhold) {
			const [tableName, setString, conditionsString] = matches;
			const setClauses = parseConditions(setString);
			const conditions = parseConditions(conditionsString);
			return {
				tableName,
				setClauses,
				conditions,
			};
		} else
			throw errorFormat(
				`UPDATE pattern did not match. Expected at least ${this.matchThreshhold} captures, got: ${matchSize}`,
			);
	}

	public async do(manager: RoSQLManager, input: SQLParsedReturns): Promise<unknown> {
		if (!manager.configuration.allowUpdate) throw errorFormat(`UPDATE is disabled.`);
		await manager.databaseMethods.updateAsync<DataFileType[]>(`${input.tableName}`, (previous, metaData) => {
			if (!previous) {
				if (manager.configuration.allowOverwrite) previous = [];
				else throw errorFormat("Table does not exist and overwrite is not allowed, so cannot update data.");
			}

			let updated = false;
			for (const value of previous) {
				let matches = true;
				if (input.conditions && objectSize(input.conditions) > 0)
					matches = checkMatchCondition(input.conditions, value);

				if (matches)
					for (const [key, val] of pairs(input.setClauses)) {
						if (metaData) {
							const [success, response] = validateNativeTypeFromMetaData(metaData, key, val.value);
							if (!success) throw response;
						}
						(<Record<string, unknown>>(<unknown>value))[key] = val.value;
					}
				updated = true;
			}
			if (!updated) throw errorFormat("No matching records found to update.");
			return [previous];
		});
		return infoFormat(`Records updated in '${input.tableName}'.`);
	}

	public getMatch(query: string): string[] {
		return <string[]>[...query.match(this.pattern)];
	}
}
