import type { Firebase } from "@rbxts/firebase";
import type {
	RoSQLQueryCommands,
	allowedConditionSymbols,
	allowedConditionalOperations,
	allowedNativeType,
	allowedNativeTypeWithParentheses,
	allowedSQLKeywords,
} from "../enums";
import type { RoSQLParser } from "../parser";
import type { ILazy } from "@rbxts/lazy";
import Signal from "@rbxts/signal";
export type DataFileType<T extends object = object> = T;
export type ConditionalSymbolsType = ArrayUnionViewable<typeof allowedConditionSymbols>;
export type ConditionalOperationsType = ArrayUnionViewable<typeof allowedConditionalOperations>;
export type RoSQLNativeTypesType = ArrayUnionViewable<typeof allowedNativeType>;
export type RoSQLKeywordsType = ArrayUnionViewable<typeof allowedSQLKeywords>;
export type RoSQLNativeTypesWithParenthesesType = ArrayUnionViewable<typeof allowedNativeTypeWithParentheses>;
export type AcceptableDatabase = DataStore | Firebase | AcceptableDatabaseMethods;
export type DatabaseType = "firebase" | "native" | "custom";
export type RoSQLQueryCommandsType = ArrayUnionViewable<typeof RoSQLQueryCommands>;
export type RoSQLKeywordsTreeType = Record<RoSQLKeywordsType, Record<string, string>>;
export type RoSQLEncryption = (data: Record<string, unknown>) => Record<string, unknown>;
export type RoSQLDecryption = (data: Record<string, unknown>) => Record<string, unknown>;
export type RoSQLGetter = AcceptableDatabaseMethods["get"];
export type RoSQLSetter = AcceptableDatabaseMethods["set"];
export type RoSQLRemover = AcceptableDatabaseMethods["remove"];
export type RoSQLUpdater = AcceptableDatabaseMethods["updateAsync"];
export type UpdateAsyncFunctionType = <T, M extends ROSQLOptionsArchitecture = ROSQLOptionsArchitecture>(
	key: string,
	transformer: (oldData: Maybe<T>, oldMetaData?: Maybe<M>) => [Maybe<T>?, Maybe<M>?],
) => Promise<T | undefined>;

export type QuerySelectType = ILazy<Record<RoSQLQueryCommandsType, RoSQLQueryCommandsFunctions>>;
export type CommitHistoryType = Record<string, string>;

export type ROSQLOptionsArchitecture =
	| Record<string, unknown>
	| Record<string, Record<string, CommitHistoryType> | Record<string, RoSQLNativeTypesType> | RoSQLKeywordsTreeType>;

export interface DecodedNativeObjectType {
	native: RoSQLNativeTypesType;
	parameters: string[];
}
export interface AcceptableDatabaseMethods {
	get: <T>(key: string) => Promise<Maybe<T>>;
	set: (key: string, value: unknown) => unknown;
	remove: (key: string) => unknown;
	updateAsync: UpdateAsyncFunctionType;
}

export interface RoSQLManagerListeners {
	coroutine: Signal<(tableName: string) => void>;
}

export interface DatastoreSQLConfig {
	allowOverwrite: boolean;
	allowInsert: boolean;
	allowSelect: boolean;
	allowUpdate: boolean;
	allowDelete: boolean;
	allowCreate: boolean;
	allowDrop: boolean;
	allowTruncate: boolean;
	allowAlter: boolean;
	allowTransaction: boolean;
	allowCommit: boolean;
	allowRollback: boolean;
	allowSetAutocommit: boolean;
	allowDataEncryption: boolean;
	allowDataDecryption: boolean;
	allowAutoDataManagement: boolean;
	allowAutoDataServerShutdownBackup: boolean;
	primaryKeyName: string;
	databaseName: string;
	commitPrefix: string;
	metadataPrefix: string;
	autocommitName: string;
	autocommitIntervalName: string;
	commitLastUpdatedName: string;
	commitHistoryName: string;
	dataTypeIndexName: string;
	keywordIndexName: string;
	autocommitInterval: number; // HOURS FORMAT
	localhostLockName: string;
	localhostQueueName: string;
	localhostQueueTimeout: number;
	localhostPollingRate: 0.2;
}

export interface BaseRoSQLNeeds {
	encryption?: RoSQLEncryption;
	decryption?: RoSQLDecryption;
}

export interface RoSQLNeeds extends BaseRoSQLNeeds {
	database: AcceptableDatabase;
	configuration?: Partial<DatastoreSQLConfig>;
	referenceDataTable?: DataFileType;
}

export interface NativeDatabaseMethods {
	GetAsync<T>(this: DataStore, key: string): [T | undefined, DataStoreKeyInfo];
	SetAsync(this: DataStore, key: string, value: unknown): unknown;
	RemoveAsync<T>(this: DataStore, key: string): [Maybe<T>, Maybe<DataStoreKeyInfo>];
}

export interface SQLParsedReturns {
	mainQuery: RoSQLQueryCommandsType;
	tableName: string;
	columns: string[];
	conditions: Record<string, ConditionalTableType>;
	values: string[];
	setClauses: Record<string, ConditionalTableType>;
}

export interface RoSQLQueryCommandsFunctions {
	readonly pattern: string;
	readonly matchThreshhold: number;
	parseArgs(query: string): Partial<SQLParsedReturns>;
	getMatch(query: string): string[];
	do(parser: RoSQLParser, input: Partial<SQLParsedReturns>): Promise<unknown>;
}

export interface ConditionalTableType {
	value: string;
	symbol: ConditionalSymbolsType;
}
