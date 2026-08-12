import { errorFormat } from "./utils/logger";
import type {
	DatastoreSQLConfig,
	QuerySelectType,
	RoSQLManagerListeners,
	RoSQLQueryCommandsFunctions,
	RoSQLQueryCommandsType,
	SQLParsedReturns,
} from "./typings/rosql-types";
import { CREATEQuery } from "./commands/CREATE";
import { DELETEQuery } from "./commands/DELETE";
import { DROPQuery } from "./commands/DROP";
import { INSERTQuery } from "./commands/INSERT";
import { SELECTQuery } from "./commands/SELECT";
import { TRUNCATEQuery } from "./commands/TRUNCATE";
import { UPDATEQuery } from "./commands/UPDATE";
import { stringHas } from "shared/utility/strings";
import { COMMITQuery } from "./commands/COMMIT";
import { ROLLBACKQuery } from "./commands/ROLLBACK";
import { AUTOCOMMITQuery } from "./commands/AUTOCOMMIT";
import { ALTERQuery } from "./commands/ALTER";
import { getMainQueryCommand } from "./utils/regex-match";
import { Lazy } from "@rbxts/lazy";
import { RoSQLQueryCommands } from "./enums";
import { isBoolean } from "shared/utility/t-isA";
export abstract class RoSQLParser {
	protected abstract configuration: DatastoreSQLConfig;
	protected abstract listeners: RoSQLManagerListeners;
	public readonly querySelection: QuerySelectType = new Lazy(() => ({
		["SELECT"]: new SELECTQuery(),
		["CREATE"]: new CREATEQuery(),
		["DROP"]: new DROPQuery(),
		["TRUNCATE"]: new TRUNCATEQuery(),
		["INSERT"]: new INSERTQuery(),
		["UPDATE"]: new UPDATEQuery(),
		["DELETE"]: new DELETEQuery(),
		["COMMIT"]: new COMMITQuery(),
		["ROLLBACK"]: new ROLLBACKQuery(),
		["SET"]: new AUTOCOMMITQuery(),
		["ALTER"]: new ALTERQuery(),
	}));

	public getQuery(query: RoSQLQueryCommandsType): RoSQLQueryCommandsFunctions {
		return this.querySelection.getValue()[query];
	}
	protected parseSQL(query: string): [RoSQLQueryCommandsFunctions, Partial<SQLParsedReturns>] {
		const main = getMainQueryCommand(query);
		if (!RoSQLQueryCommands.includes(main))
			throw errorFormat(`Mismatched query name. Unable to parse SQL string; got ${main}`);
		else if (!this.checkAllowedQuery(main))
			throw errorFormat(`The Query '${main}' is not allowed for use; ACCESS DENIED`);
		const mainSelector = this.getQuery(main);
		const response = mainSelector.parseArgs(query);
		response.mainQuery = main;
		if (main === "SELECT") this.listeners.coroutine.Fire(response.tableName!);
		return [mainSelector, response];
	}

	protected checkAllowedQuery(main: RoSQLQueryCommandsType): boolean {
		for (const [allowed, isAllowed] of pairs(this.configuration)) {
			if (stringHas(allowed.upper(), main, 5) && isBoolean(isAllowed)) return isAllowed;
		}
		return false;
	}

	protected async executeCommand<T>(query: RoSQLQueryCommandsType, input: Partial<SQLParsedReturns>): Promise<T> {
		if (!RoSQLQueryCommands.includes(query))
			throw errorFormat(`Mismatched query name. Unable to execute command; got ${query}`);
		if (!this.checkAllowedQuery(query))
			throw errorFormat(`The Query '${query}' is not allowed for use; ACCESS DENIED`);
		if (query === "SELECT" && input.tableName) this.listeners.coroutine.Fire(input.tableName);
		return <T>await this.getQuery(query).do(this, <SQLParsedReturns>input);
	}
}
