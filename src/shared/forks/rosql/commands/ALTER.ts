import { errorFormat, infoFormat } from "../utils/logger";
import type {
	ConditionalOperationsType,
	ConditionalSymbolsType,
	DataFileType,
	RoSQLQueryCommandsFunctions,
	SQLParsedReturns,
} from "../typings/rosql-types";
import { handleKeyword, handleOperation, isolateKeyword, qualifyKeyword, qualifyOperation } from "../utils/parse";
import { stripWhitespace } from "shared/utility/strings";
import { allowedConditionSymbols } from "../enums";
import { RoSQLManager } from "../manager";

export class ALTERQuery implements RoSQLQueryCommandsFunctions {
	constructor() {}
	public readonly pattern: string = "ALTER%s+TABLE%s+(%S+)%s+(.+)";
	public readonly matchThreshhold: number = 4;

	public parseArgs(query: string): Partial<SQLParsedReturns> {
		const matches = this.getMatch(query);
		const realMatches = [matches[0], ...matches[1].split(" ").map((match) => stripWhitespace(match))];
		const matchSize = realMatches.size();
		if (matchSize >= this.matchThreshhold) {
			const [tableName, operation, columnString, index, indexArg, indexArg2] = realMatches;
			if (columnString !== "COLUMN" && !allowedConditionSymbols.includes(<ConditionalSymbolsType>columnString))
				throw errorFormat(
					`When using the ALTER query, could not find the column or symbol operation. Got ${columnString}.`,
				);
			return {
				tableName,
				values: [operation, columnString, index, indexArg, indexArg2],
			};
		} else
			throw errorFormat(
				`ALTER pattern did not match. Expected at least ${this.matchThreshhold} captures, got: ${matchSize}`,
			);
	}

	public async do(manager: RoSQLManager, input: SQLParsedReturns): Promise<unknown> {
		if (!manager.configuration.allowAlter) throw errorFormat(`ALTER is disabled.`);
		if (input.values.isEmpty()) throw errorFormat("ALTER query is missing columns or values.");
		const [operationExtracted, columnString, index, indexArg, indexArg2] = input.values;
		const [operation, operationParams] = isolateKeyword(operationExtracted);
		const isOperation = qualifyOperation(<ConditionalOperationsType>operation, index, indexArg, indexArg2);
		const isKeywordOperation = qualifyKeyword(operation, columnString, index);
		if (!isOperation && !isKeywordOperation)
			throw errorFormat(
				`Alter's operation [${operation}] has invalid parameters. Please refer to the documentation.`,
			);
		await manager.databaseMethods.updateAsync<DataFileType[]>(input.tableName, (previous, metaData) => {
			if (!metaData)
				throw errorFormat(
					`You have disabled the necessities to enable Metadata for ALTER queries. Please enable it in the config.`,
				);
			if (!previous) throw errorFormat("Table does not exist in order to alter data.");
			if (isOperation)
				handleOperation(previous, metaData, <ConditionalOperationsType>operation, index, indexArg, indexArg2);
			else handleKeyword(metaData, operation, index, operationParams);
			return [previous, metaData];
		});
		return infoFormat(`Altered table '${input.tableName}' successfully.`);
	}

	public getMatch(query: string): string[] {
		return <string[]>[...query.match(this.pattern)];
	}
}
