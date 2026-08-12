import type { DatastoreSQLConfig } from "shared/forks/rosql/typings/rosql-types";

export interface FirebaseLike<T = unknown> {
	get<TValue = T>(key: string, defaultValue?: TValue): TValue | Promise<TValue>;
	set<TValue = T>(key: string, value: TValue): void | Promise<void>;
	addToArray<TValue = T>(key: string, value: TValue): void | Promise<void>;
}


export type TypedPromise<T> = Promise<T>;

export interface DataStore {
	GetAsync: (key: string) => unknown;
	SetAsync: (key: string, value: unknown) => void;
	UpdateAsync: (key: string, transformFunction: (oldValue: unknown) => unknown) => unknown;
	RemoveAsync: (key: string) => void;
}

export interface DatastoreSQLConnection {
	datastore?: DataStore;
	firebase?: FirebaseLike;
	backendType: "datastore" | "firebase";
	config: DatastoreSQLConfig;
	query(query: string): TypedPromise<unknown>;
	parseSQL(query: string): unknown;
	createTable(tableName: string, columns: unknown[]): [boolean, string?];
	dropTable(tableName: string): [boolean, string?];
	truncateTable(tableName: string): [boolean, string?];
	insert(tableName: string, columns: unknown[], values: unknown[]): [boolean, string?];
	select(tableName: string, columns: unknown[], conditions?: Record<string, unknown>): [unknown, string?];
	update(
		tableName: string,
		setClauses: Record<string, unknown>,
		conditions?: Record<string, unknown>,
	): [boolean, string?];
	delete(tableName: string, conditions?: Record<string, unknown>): [boolean, string?];
}

export interface FirebaseSQLConnection extends Omit<DatastoreSQLConnection, "datastore"> {
	firebase: FirebaseLike;
	firebaseTable: object;
	backendType: "firebase";
}

export interface ProfileSQLConnection {
	profilesTable: Record<string, unknown>;
	config: DatastoreSQLConfig;
	query(query: string): TypedPromise<unknown>;
	parseSQL(query: string): unknown;
	insert(tableName: string, columns: unknown[], values: unknown[]): [boolean, string?];
	select(
		tableName: string,
		columns: unknown[],
		conditions?: Record<string, unknown>,
		options?: Record<string, unknown>,
	): [unknown, string?];
	update(
		tableName: string,
		setClauses: Record<string, unknown>,
		conditions?: Record<string, unknown>,
	): [boolean, string?];
	delete(tableName: string, conditions?: Record<string, unknown>): [boolean, string?];
	createTable(tableName: string, schema: Record<string, unknown>): [boolean, string?];
	dropTable(tableName: string): [boolean, string?];
	alterTable(tableName: string, alteration: Record<string, unknown>): [boolean, string?];
	truncateTable(tableName: string): [boolean, string?];
	beginTransaction(): [boolean, string?];
	commitTransaction(): [boolean, string?];
	rollbackTransaction(): [boolean, string?];
}

export interface DatastoreSQL {
	connect(target: DataStore | FirebaseLike, config: DatastoreSQLConfig): TypedPromise<DatastoreSQLConnection>;
	connectToFirebase(firebase: FirebaseLike, config: DatastoreSQLConfig): TypedPromise<FirebaseSQLConnection>;
	connectToProfileService(
		profilesTable: Record<string, unknown>,
		config: DatastoreSQLConfig,
	): TypedPromise<ProfileSQLConnection>;
}

export interface RSQLModule extends DatastoreSQL {
	Promise: typeof Promise;
	Signal: unknown;
	Types: unknown;
}
