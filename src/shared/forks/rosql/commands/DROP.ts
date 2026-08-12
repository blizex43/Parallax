import { stripWhitespace } from "shared/utility/strings";
import { errorFormat, infoFormat } from "../utils/logger";
import type { DataFileType, RoSQLQueryCommandsFunctions, SQLParsedReturns } from "../typings/rosql-types";
import { RoSQLManager } from "../manager";

export class DROPQuery implements RoSQLQueryCommandsFunctions {
	constructor() {}
	public readonly pattern: string = "^DROP%s+TABLE%s+([%w_]+)%s*$";
	public readonly matchThreshhold: number = 1;

	public parseArgs(query: string): Partial<SQLParsedReturns> {
		const matches = this.getMatch(query);
		const matchSize = matches.size();
		if (matchSize >= this.matchThreshhold) {
			const [tableName] = matches;
			return {
				tableName: stripWhitespace(tableName),
			};
		} else
			throw errorFormat(
				`DROP pattern did not match. Expected at least ${this.matchThreshhold} captures, got: ${matchSize}`,
			);
	}

	public async do(manager: RoSQLManager, input: SQLParsedReturns): Promise<unknown> {
		if (!manager.configuration.allowDrop) throw errorFormat(`DROP is disabled.`);
		await manager.databaseMethods.updateAsync<DataFileType[]>(`${input.tableName}`, (previous) => {
			if (!previous) throw errorFormat(`Table '${input.tableName}' does not exist.`);
			return [undefined];
		});
		return infoFormat(`Table '${input.tableName}' dropped successfully.`);
	}

	public getMatch(query: string): string[] {
		return <string[]>[...query.match(this.pattern)];
	}
}
