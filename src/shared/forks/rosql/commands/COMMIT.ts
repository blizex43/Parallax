import { errorFormat, infoFormat } from "../utils/logger";
import type {
	RoSQLQueryCommandsFunctions,
	ROSQLOptionsArchitecture,
	SQLParsedReturns,
	CommitHistoryType,
	DataFileType,
} from "../typings/rosql-types";
import { stripWhitespace } from "shared/utility/strings";
import { appendWithSha256 } from "../utils/regex-match";
import { RoSQLManager } from "../manager";
export class COMMITQuery implements RoSQLQueryCommandsFunctions {
	constructor() {}
	public readonly pattern: string = "^COMMIT%s+(%S+)%s*(.*)$";
	public readonly matchThreshhold: number = 1;
	public parseArgs(query: string): Partial<SQLParsedReturns> {
		const matches = this.getMatch(query);
		const matchSize = matches.size();
		if (matchSize >= this.matchThreshhold) {
			const [tableName, commitName] = matches;
			return {
				tableName: stripWhitespace(tableName),
				values: [commitName.size() > 0 ? commitName : <never>undefined],
			};
		} else
			throw errorFormat(
				`COMMIT pattern did not match. Expected at least ${this.matchThreshhold} captures, got: ${matchSize}`,
			);
	}

	public async do(manager: RoSQLManager, input: SQLParsedReturns): Promise<unknown> {
		if (!manager.configuration.allowCommit) throw errorFormat(`COMMIT is disabled.`);
		const existingTable = await manager.databaseMethods.get<DataFileType[]>(input.tableName);
		if (!existingTable)
			throw errorFormat(
				`Table '${input.tableName}' does not exist! Cannot backup (commit) a table that does not exist.`,
			);
		const commitDate = DateTime.now().ToIsoDate();
		const commitName = input.values.isEmpty() ? appendWithSha256() : input.values[0];
		await manager.databaseMethods.updateAsync<Record<string, DataFileType[]>>(
			`${manager.configuration.commitPrefix}${input.tableName}`,
			(previousCommit, previousMetadata) => {
				previousCommit ??= <Record<string, DataFileType[]>>{};
				if (!previousMetadata)
					throw errorFormat(
						`Unable to assume commit metadata. You need to enable Metadata for this table to use COMMIT.`,
					);
				this.fillCommitOptions(manager, previousMetadata, commitName, commitDate);
				previousCommit[commitName] = existingTable;
				return [previousCommit, previousMetadata];
			},
		);
		return infoFormat(
			`Table '${input.tableName}' has been backed up (commited) successfully with the alias [${commitName}].`,
		);
	}

	public getMatch(query: string): string[] {
		return <string[]>[...query.match(this.pattern)];
	}

	private fillCommitOptions(
		manager: RoSQLManager,
		options: ROSQLOptionsArchitecture,
		name: string,
		date: string,
	): ROSQLOptionsArchitecture {
		const history = <Record<string, CommitHistoryType>>options[manager.configuration.commitHistoryName] ?? {};
		options[manager.configuration.autocommitIntervalName] = date;
		if (name in history)
			print(infoFormat(`Found existing commit of the same name; '${name}'. Attempting to overwrite...`));
		history[name] = { [manager.configuration.commitLastUpdatedName]: date };
		options[manager.configuration.commitHistoryName] = history;
		return options;
	}
}
