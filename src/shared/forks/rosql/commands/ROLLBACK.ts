import { errorFormat, infoFormat } from "../utils/logger";
import type {
	CommitHistoryType,
	RoSQLQueryCommandsFunctions,
	ROSQLOptionsArchitecture,
	SQLParsedReturns,
	DataFileType,
} from "../typings/rosql-types";
import { stripWhitespace } from "shared/utility/strings";
import { objectSize } from "shared/utility/t-isA";
import { RoSQLManager } from "../manager";
export class ROLLBACKQuery implements RoSQLQueryCommandsFunctions {
	constructor() {}
	public readonly pattern: string = "^ROLLBACK%s+(%S+)%s*(.*)$";
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
				`ROLLBACK pattern did not match. Expected at least ${this.matchThreshhold} captures, got: ${matchSize}`,
			);
	}

	public async do(manager: RoSQLManager, input: SQLParsedReturns): Promise<unknown> {
		if (!manager.configuration.allowRollback) throw errorFormat(`ROLLBACK is disabled.`);
		const existingCommits = await manager.databaseMethods.get<Record<string, DataFileType[]>>(
			<string>`${manager.configuration.commitPrefix}${input.tableName}`,
		);
		const existingOptions = <ROSQLOptionsArchitecture>(
			((await manager.databaseMethods.get<ROSQLOptionsArchitecture>(
				`${manager.configuration.metadataPrefix}${input.tableName}`,
			)) ?? {})
		);
		const [commitName] = input.values;
		if (!existingCommits) throw errorFormat(`The commits for '${input.tableName}' have not been found! `);
		else if (!existingOptions)
			throw errorFormat(
				`Unable to assume commit metadata. The commit database has been corrupted, make sure to make a new commit to rebuild your database's metadata.`,
			);
		else if (commitName && !(commitName in existingCommits))
			throw errorFormat(
				`The requested commit: [${commitName}] has not been found in the database. Falling back to not disrupt data structure.`,
			);
		else if (objectSize(existingCommits) === 0)
			throw errorFormat(`The commits for '${input.tableName}' have not been found; Commit size is 0.`);

		const [correctCommitName, correctCommitValue] = input.values.isEmpty()
			? (this.selectLatestCommit(this.getLatestCommits(manager, existingOptions), existingCommits) ??
				this.getCommitFromRecord(existingCommits))
			: commitName
				? [commitName, existingCommits[commitName]]
				: this.getCommitFromRecord(existingCommits);
		await manager.databaseMethods.set(input.tableName, correctCommitValue);
		return infoFormat(
			`Table '${input.tableName}' has been rolled back to the latest commit successfully. Commit Name: [${commitName ?? correctCommitName}]`,
		);
	}

	private getLatestCommits(
		manager: RoSQLManager,
		options: ROSQLOptionsArchitecture,
	): (CommitHistoryType & { name: string })[] {
		const sortedMetadataCommits: (CommitHistoryType & { name: string })[] = [];

		for (const [name, metadata] of pairs(
			<Record<string, CommitHistoryType>>options[manager.configuration.commitHistoryName],
		)) {
			sortedMetadataCommits.push({
				name,
				...metadata,
			});
		}

		sortedMetadataCommits.sort((a, b) => a["last-updated"] > b["last-updated"]);
		return sortedMetadataCommits;
	}

	private selectLatestCommit(
		sortedCommitMetadata: (CommitHistoryType & { name: string })[],
		commits: Record<string, DataFileType[]>,
	): Maybe<[string, DataFileType[]]> {
		for (const [, commitMetaData] of ipairs(sortedCommitMetadata))
			if (commitMetaData.name in commits) return [commitMetaData.name, commits[commitMetaData.name]];
		return;
	}

	private getCommitFromRecord(commits: Record<string, DataFileType[]>): [string, DataFileType[]] {
		if (objectSize(commits) === 0)
			throw errorFormat(
				`Unable to get a commit: Tried to fetch a commit while assuming commit's already existed.`,
			);
		return next(commits);
	}

	public getMatch(query: string): string[] {
		return <string[]>[...query.match(this.pattern)];
	}
}
