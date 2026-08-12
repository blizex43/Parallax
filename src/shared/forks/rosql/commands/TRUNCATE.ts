import { errorFormat, infoFormat } from "../utils/logger";
import type { DataFileType, RoSQLQueryCommandsFunctions, SQLParsedReturns } from "../typings/rosql-types";
import { RoSQLManager } from "../manager";

export class TRUNCATEQuery implements RoSQLQueryCommandsFunctions {
	constructor() {}
	public readonly pattern: string = "^TRUNCATE%s+TABLE%s+([%w_]+)%s*$";
	public readonly matchThreshhold: number = 1;

	public parseArgs(query: string): Partial<SQLParsedReturns> {
		const matches = this.getMatch(query);
		const matchSize = matches.size();
		if (matchSize >= this.matchThreshhold) {
			const [tableName] = matches;
			return {
				tableName,
			};
		} else
			throw errorFormat(
				`TRUNCATE pattern did not match. Expected at least ${this.matchThreshhold} captures, got: ${matchSize}`,
			);
	}

	public async do(manager: RoSQLManager, input: SQLParsedReturns): Promise<unknown> {
		if (!manager.configuration.allowTruncate) throw errorFormat(`TRUNCATE is disabled.`);
		await manager.databaseMethods.updateAsync<DataFileType[]>(input.tableName, (previous) => {
			if (!previous) throw errorFormat(`Table '${input.tableName}' does not exist.`);
			return [[]];
		});
		return infoFormat(`Table '${input.tableName}' truncated successfully.`);
	}

	public getMatch(query: string): string[] {
		return <string[]>[...query.match(this.pattern)];
	}
}
