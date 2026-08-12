import type { AcceptableDatabase, BaseRoSQLNeeds, DataFileType, RoSQLNeeds } from "./typings/rosql-types";
import { defaultSQLConfig } from "./enums";
import { isModuleScript } from "shared/utility/t-isA";
import { readDotEnv } from "./utils/dotenv";
import { errorFormat } from "./utils/logger";
import { DataStoreService as dss } from "@rbxts/services";
import { RoSQLManager } from "./manager";
export class RoSQL extends RoSQLManager {
	constructor(needs: RoSQLNeeds) {
		super(needs);
	}

	public async query<T>(queryText: string): Promise<Maybe<T>> {
		const [mainFunction, arguements] = this.parseSQL(queryText);
		return <Maybe<T>>await mainFunction.do(this, arguements);
	}

	public static async fromDotEnv(
		file: ModuleScript | string,
		database?: AcceptableDatabase,
		referenceDataFile?: DataFileType,
		cryptions?: BaseRoSQLNeeds,
	): Promise<RoSQL> {
		if (isModuleScript(file)) file = require<string>(file);
		const configuration = readDotEnv(file, defaultSQLConfig);
		database ??= "databaseName" in configuration ? dss.GetDataStore(configuration.databaseName!) : undefined;
		if (!database) throw errorFormat(`Missing key "databaseName" in .env file.`);
		return new RoSQL({
			configuration,
			database,
			encryption: cryptions?.encryption,
			decryption: cryptions?.decryption,
			referenceDataTable: referenceDataFile,
		});
	}
}
