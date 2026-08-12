import { errorFormat, infoFormat } from "../utils/logger";
import type {
	DataFileType,
	RoSQLKeywordsType,
	RoSQLNativeTypesType,
	RoSQLQueryCommandsFunctions,
	SQLParsedReturns,
} from "../typings/rosql-types";
import {
	appendKeywordToMetaData,
	appendNativeTypeToMetaData,
	isRoSQLDataType,
	isRoSQLKeyword,
} from "../utils/functions";
import { trim } from "@rbxts/string-utils";
import { stripWhitespace } from "shared/utility/strings";
import { extractParentheses, stripParentheses } from "../utils/regex-match";
import { RoSQLManager } from "../manager";

export class CREATEQuery implements RoSQLQueryCommandsFunctions {
	constructor() {}
	public readonly pattern: string = "^CREATE%s+TABLE%s+([%w_]+)%s*%(([%w_,%s]+)%)$";
	public readonly matchThreshhold: number = 2;

	public parseArgs(query: string): Partial<SQLParsedReturns> {
		const matches = this.getMatch(query);
		const matchSize = matches.size();
		if (matchSize >= this.matchThreshhold) {
			const [tableName, columnsString] = matches;
			const columnsAndDataTypes = columnsString.split(",").map((column) => trim(column));
			return {
				tableName,
				columns: columnsAndDataTypes,
			};
		} else
			throw errorFormat(
				`CREATE pattern did not match. Expected at least ${this.matchThreshhold} captures, got: ${matchSize}`,
			);
	}

	public async do(manager: RoSQLManager, input: SQLParsedReturns): Promise<unknown> {
		if (!manager.configuration.allowCreate) throw errorFormat(`CREATE is disabled.`);
		await manager.databaseMethods.updateAsync<DataFileType[]>(input.tableName, (previous, metaData) => {
			if (previous) throw errorFormat(`Table '${input.tableName}' already exists.`);
			if (metaData)
				for (const columnPack of input.columns) {
					const [column] = columnPack.split(" ");
					if (column)
						for (const packValue of columnPack.split(" ")) {
							if (column === packValue) continue;
							const formattedPack = stripWhitespace(packValue);
							const parameters = extractParentheses(formattedPack);
							const isolatedPack = stripParentheses(formattedPack);
							if (isRoSQLDataType(isolatedPack))
								appendNativeTypeToMetaData(metaData, column, <RoSQLNativeTypesType>isolatedPack);
							else if (isRoSQLKeyword(packValue))
								appendKeywordToMetaData(
									metaData,
									<RoSQLKeywordsType>isolatedPack,
									parameters.isEmpty() ? "1" : parameters[0],
									column,
								);
						}
				}
			return [[], metaData];
		});
		return infoFormat(`Table '${input.tableName}' created successfully.`);
	}

	public getMatch(query: string): string[] {
		return <string[]>[...query.match(this.pattern)];
	}
}
