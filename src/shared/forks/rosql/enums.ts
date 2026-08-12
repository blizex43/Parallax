import type { DatastoreSQLConfig } from "./typings/rosql-types";

export const RoSQLQueryCommands = <const>[
	"SELECT",
	"CREATE",
	"DROP",
	"TRUNCATE",
	"INSERT",
	"UPDATE",
	"DELETE",
	"COMMIT",
	"ROLLBACK",
	"SET",
	"ALTER",
];

export const defaultSQLConfig: DatastoreSQLConfig = <const>{
	allowOverwrite: true,
	allowInsert: true,
	allowSelect: true,
	allowUpdate: true,
	allowDelete: true,
	allowCreate: true,
	allowDrop: true,
	allowTruncate: true,
	allowAlter: true,
	allowTransaction: true,
	allowCommit: true,
	allowRollback: true,
	allowSetAutocommit: true,
	allowDataDecryption: true,
	allowDataEncryption: true,
	allowAutoDataManagement: true,
	allowAutoDataServerShutdownBackup: true,
	allowInitialCommitFromAutoCommitFunction: true,
	initialAutocommitAlias: "init",
	primaryKeyName: "userId",
	databaseName: "nan",
	commitPrefix: "READONLY-COMMIT-",
	metadataPrefix: "METADATA-",
	autocommitName: "autocommit",
	autocommitIntervalName: "last-commited",
	commitLastUpdatedName: "last-updated",
	commitHistoryName: "commit-history",
	dataTypeIndexName: "data-type-allocation",
	keywordIndexName: "keywords",
	autocommitInterval: 24,
	localhostLockName: "ROSQL-ServerLock",
	localhostQueueName: "ROSQL-Queue",
	localhostQueueTimeout: 4,
	localhostPollingRate: 0.2,
};

export const allowedConditionSymbols = <const>["=", "<", ">", "<=", ">=", "!="];
export const allowedConditionalOperations = <const>["ADD", "DROP", "RENAME", "MODIFY"];
export const allowedSQLKeywords = <const>["AUTO_INCREMENT", "PRIMARY_KEY"];
export const allowedNativeType = <const>[
	"INT",
	"STRING",
	"DATE",
	"TIME",
	"DATETIME",
	"TIMESTAMP",
	"CHAR",
	"VARCHAR",
	"SET",
	"DECIMAL",
	"BOOLEAN",
];
export const allowedNativeTypeWithParentheses = <const>["CHAR", "VARCHAR", "SET", "DECIMAL"];
