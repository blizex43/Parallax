import { errorFormat, infoFormat } from "../utils/logger";
import type { DataFileType, RoSQLQueryCommandsFunctions, SQLParsedReturns } from "../typings/rosql-types";
import { checkMatchCondition, validateNativeTypeFromMetaData } from "../utils/parse";
import { objectSize } from "shared/utility/t-isA";
import { parseConditions } from "../utils/regex-match";
import { RoSQLManager } from "../manager";
import { basicDataDecrypt } from "shared/utility/data";

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

		const useFastIndexing = manager.configuration.allowEnforcePrimaryKeyForFastIndexing;

		await manager.databaseMethods.updateAsync<DataFileType[] | Record<string, unknown>>(
			`${input.tableName}`,
			(previous, metaData) => {
				if (!previous) {
					if (manager.configuration.allowOverwrite) previous = useFastIndexing ? {} : [];
					else throw errorFormat("Table does not exist and overwrite is not allowed, so cannot update data.");
				}

				let updated = false;

				if (useFastIndexing) {
					for (const [conditional_key, conditional_value] of pairs(input.conditions)) {
						if (
							conditional_key === manager.configuration.primaryKeyName &&
							conditional_value.symbol === "=" &&
							conditional_value.value in previous
						) {
							delete input.conditions[conditional_key];
							const recordValue = <Record<string, unknown>>(
								(<Record<string, unknown>>previous)[conditional_value.value]
							);

							for (const [setKey, setVal] of pairs(input.setClauses)) {
								if (metaData) {
									const [success, response] = validateNativeTypeFromMetaData(
										metaData,
										setKey,
										setVal.value,
									);
									if (!success) throw response;
								}
								recordValue[setKey] = setVal.value;
							}
							updated = true;
						}
					}
				}
				if (updated && objectSize(input.conditions) === 0) return [previous];
				for (const value of <DataFileType[]>(<unknown>previous)) {
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
			},
		);
		return infoFormat(`Records updated in '${input.tableName}'.`);
	}

	public getMatch(query: string): string[] {
		return <string[]>[...query.match(this.pattern)];
	}
}
