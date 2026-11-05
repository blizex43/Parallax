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
		if (manager.type === "firebase") return await this.rollbackFirebase(manager, input);

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

	private async rollbackFirebase(manager: RoSQLManager, input: SQLParsedReturns): Promise<unknown> {
		const existingOptions = <ROSQLOptionsArchitecture>(
			((await manager.databaseMethods.get<ROSQLOptionsArchitecture>(
				`${manager.configuration.metadataPrefix}${input.tableName}`,
			)) ?? {})
		);
		const history = <Record<string, CommitHistoryType>>existingOptions[manager.configuration.commitHistoryName];
		let commitName: Maybe<string> = input.values[0];
		const latestCommitName = <Maybe<string>>existingOptions["latest-commit"];
		if (!commitName && latestCommitName && history?.[latestCommitName]) commitName = latestCommitName;
		if (!commitName && history) commitName = this.getLatestCommitName(manager, history);

		if (!commitName) {
			const existingCommits = await manager.databaseMethods.get<Record<string, DataFileType[]>>(
				`${manager.configuration.commitPrefix}${input.tableName}`,
			);
			if (!existingCommits || objectSize(existingCommits) === 0)
				throw errorFormat(`The commits for '${input.tableName}' have not been found!`);
			commitName = this.getCommitFromRecord(existingCommits)[0];
		}

		const commitMetadata = history?.[commitName];
		const storageKey = commitMetadata?.["storage-key"] ?? commitName;
		const commitData = await manager.databaseMethods.get<Record<string, DataFileType>>(
			`${manager.configuration.commitPrefix}${input.tableName}/${storageKey}`,
		);
		if (!commitData) throw errorFormat(`The requested commit: [${commitName}] has not been found in the database.`);

		if (commitMetadata?.["storage-key"]) {
			await manager.databaseMethods.updateAsync<Record<string, DataFileType>>(
				input.tableName,
				(previous) => {
					previous ??= {};
					for (const [userId, playerData] of pairs(commitData)) previous[userId] = playerData;
					return [previous];
				},
				{ prefix: "", useMetadata: false },
			);
		} else {
			await manager.databaseMethods.set(input.tableName, commitData);
		}

		return infoFormat(
			`Table '${input.tableName}' has been rolled back to the commit successfully. Commit Name: [${commitName}]`,
		);
	}

	private getLatestCommitName(manager: RoSQLManager, history: Record<string, CommitHistoryType>): Maybe<string> {
		let latestName: Maybe<string>;
		let latestDate = "";
		for (const [name, metadata] of pairs(history)) {
			const date = metadata[manager.configuration.commitLastUpdatedName] ?? "";
			if (!latestName || date > latestDate) {
				latestName = name;
				latestDate = date;
			}
		}
		return latestName;
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
