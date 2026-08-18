import { errorFormat } from "./logger";
import type {
	AcceptableDatabase,
	AcceptableDatabaseMethods,
	DatabaseType,
	RoSQLDecryption,
	RoSQLEncryption,
	RoSQLGetter,
	ROSQLOptionsArchitecture,
	RoSQLRemover,
	RoSQLSetter,
	RoSQLUpdater,
} from "../typings/rosql-types";
import { Firebase } from "@rbxts/firebase";
import { constructCustomUpdateAsync } from "./functions";
import { RoSQLManager } from "../manager";
import { formatToDatabase, formatToGame } from "shared/utility/data";

type ResolvedDatabase = [DatabaseType, RoSQLGetter, RoSQLSetter, RoSQLRemover, RoSQLUpdater];
export class RoSQLResolver {
	public async resolveDatabaseType(database: AcceptableDatabase, manager: RoSQLManager): Promise<ResolvedDatabase> {
		const databaseType = this.getDatabaseType(database);
		switch (databaseType) {
			case "firebase":
				return this.resolveFirebase(database, manager);
			case "native":
				return this.resolveNative(database, manager);
			case "custom":
				return this.resolveCustom(database);
		}
	}

	private getDatabaseType(database: AcceptableDatabase): DatabaseType {
		if ("GetAsync" in database && "SetAsync" in database) {
			return "native";
		}
		if ("get" in database && "set" in database && "addToArray" in database) {
			return "firebase";
		}
		if ("get" in database && "set" in database) {
			return "custom";
		}
		throw errorFormat(
			"Incorrectly inputted database. Please make sure to follow the instructions script to ensure you have the correct methods!",
		);
	}

	public getEncryption(): RoSQLEncryption {
		return (data: Record<string, unknown>): Record<string, unknown> => {
			return formatToDatabase(data);
		};
	}

	public getDecryption(): RoSQLDecryption {
		return (data: Record<string, unknown>): Record<string, unknown> => {
			return formatToGame(data);
		};
	}

	private async resolveFirebase(database: AcceptableDatabase, manager: RoSQLManager): Promise<ResolvedDatabase> {
		const firebase = <Firebase>database;
		const get: RoSQLGetter = (key: string) => firebase.get(`${key}/`);
		const set: RoSQLSetter = (key: string, value: unknown) => firebase.set(`${key}/`, value);
		const remove: RoSQLRemover = (key: string) => firebase.delete(`${key}/`);
		const update = await constructCustomUpdateAsync(manager, get, set);
		return ["firebase", get, set, remove, update];
	}
	private async resolveNative(database: AcceptableDatabase, manager: RoSQLManager): Promise<ResolvedDatabase> {
		const dataStore = <DataStore>database;
		const get: RoSQLGetter = async <T>(key: string) => <Maybe<T>>dataStore.GetAsync(key);
		const set: RoSQLSetter = async (key: string, value: unknown) => dataStore.SetAsync(key, value);
		const remove: RoSQLRemover = async (key: string) => dataStore.RemoveAsync(key);
		const update = await constructCustomUpdateAsync(manager, get, set);
		return ["native", get, set, remove, update];
	}
	private async resolveCustom(database: AcceptableDatabase): Promise<ResolvedDatabase> {
		const customDatabase = <AcceptableDatabaseMethods>database;
		const get: RoSQLGetter = <T>(key: string) => <Promise<Maybe<T>>>Promise.resolve(customDatabase.get(key));
		const set: RoSQLSetter = (key: string, value: unknown) => Promise.resolve(customDatabase.set(key, value));
		const remove: RoSQLRemover = (key: string) => Promise.resolve(customDatabase.remove(key));
		const update: RoSQLUpdater = async <T, M extends ROSQLOptionsArchitecture = ROSQLOptionsArchitecture>(
			key: string,
			transformer: (oldData: Maybe<T>, oldMetaData?: Maybe<M>) => [Maybe<T>?, Maybe<M>?],
		): Promise<Maybe<T>> =>
			<Promise<Maybe<T>>>(
				customDatabase.updateAsync<T, M>(key, (oldData, oldMetaData) => transformer(oldData, oldMetaData))
			);
		return ["custom", get, set, remove, update];
	}
}
