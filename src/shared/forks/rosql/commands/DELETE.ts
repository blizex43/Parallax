import { errorFormat, infoFormat } from "../utils/logger";
import type { DataFileType, RoSQLQueryCommandsFunctions, SQLParsedReturns } from "../typings/rosql-types";
import { checkMatchCondition } from "../utils/parse";
import { objectSize } from "shared/utility/t-isA";
import { parseConditions } from "../utils/regex-match";
import { RoSQLManager } from "../manager";
import { basicDataDecrypt } from "shared/utility/data";

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
		const useFastIndexing = manager.configuration.primaryKeyName;

		await manager.databaseMethods.updateAsync<DataFileType[] | Record<string, unknown>>(
			input.tableName,
			(previous) => {
				if (!previous) throw errorFormat(`Table '${input.tableName}' does not exist.`);

				if (useFastIndexing) {
					for (const [conditional_key, conditional_value] of pairs(input.conditions)) {

						if (
							conditional_key === manager.configuration.primaryKeyName &&
							conditional_value.symbol === "=" &&
							conditional_value.value in previous
						) {
							delete input.conditions[conditional_key];
							delete (<Record<string, unknown>>previous)[conditional_value.value];
							return [previous];
						}
					}
				} else {
					if ((<DataFileType[]>previous).size() === 0) throw errorFormat("All records are already deleted.");
					const previousSize = (<DataFileType[]>previous).size();
					(<DataFileType[]>previous).forEach((value, index) => {
						let matches = true;
						if (input.conditions && objectSize(input.conditions) > 0) {
							matches = checkMatchCondition(input.conditions, value);
						}
						if (matches) (<DataFileType[]>previous).remove(index);
					});

					if ((<DataFileType[]>previous).size() === previousSize)
						throw errorFormat("No matching records found to delete.");

					return [previous];
				}

				return [previous];
			},
		);
		return infoFormat(`Records deleted from '${input.tableName}'.`);
	}

	public getMatch(query: string): string[] {
		return <string[]>[...query.match(this.pattern)];
	}
}
