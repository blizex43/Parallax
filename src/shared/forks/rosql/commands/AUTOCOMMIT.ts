import { errorFormat, infoFormat } from "../utils/logger";
import type { RoSQLQueryCommandsFunctions, ROSQLOptionsArchitecture, SQLParsedReturns } from "../typings/rosql-types";
import { stripWhitespace } from "shared/utility/strings";
import { RoSQLManager } from "../manager";
export class AUTOCOMMITQuery implements RoSQLQueryCommandsFunctions {
	constructor() {}
	public readonly pattern: string = "^SET%s+AUTOCOMMIT%s+(%S+)%s*=%s*(%S+)%s*$";
	public readonly matchThreshhold: number = 2;
	public parseArgs(query: string): Partial<SQLParsedReturns> {
		const matches = this.getMatch(query);
		const matchSize = matches.size();
		if (matchSize >= this.matchThreshhold) {
			const [tableName, enabled] = matches;
			if (enabled !== "ON" && enabled !== "OFF")
				throw errorFormat(
					`Encountered value error. Setting the AUTOCOMMIT value can only be either 'ON' or 'OFF', not '${enabled}.`,
				);
			return {
				tableName: stripWhitespace(tableName),
				values: [enabled],
			};
		} else
			throw errorFormat(
				`SET pattern did not match. Expected at least ${this.matchThreshhold} captures, got: ${matchSize}`,
			);
	}

	public async do(manager: RoSQLManager, input: SQLParsedReturns): Promise<unknown> {
		await manager.databaseMethods.updateAsync<ROSQLOptionsArchitecture>(
			`${input.tableName}`,
			(previous) => {
				previous ??= <ROSQLOptionsArchitecture>{};
				previous[manager.configuration.autocommitName] = input.values[0] === "ON" ? true : false;
				previous[manager.configuration.autocommitIntervalName] = DateTime.now().ToIsoDate();
				return [previous];
			},
			{ prefix: manager.configuration.metadataPrefix, useMetadata: false },
		);
		return infoFormat(`Table '${input.tableName}' has successfully written AUTOCOMMIT to options.`);
	}

	public getMatch(query: string): string[] {
		return <string[]>[...query.match(this.pattern)];
	}
}
