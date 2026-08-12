import { MemoryStoreService as mss } from "@rbxts/services";

export class LocalHost {
	public static async getHost(name: string): Promise<MemoryStoreSortedMap> {
		return mss.GetSortedMap(name);
	}

	public static async updateHost<T, R>(
		host: MemoryStoreSortedMap,
		key: string,
		transformFunction: (value: R) => T,
		expiry: number,
	): Promise<T> {
		print(`[HOST] UpdateAsync START: ${key}`);

		try {
			const result = await host.UpdateAsync(key, <(value: unknown) => T>transformFunction, expiry);
			print(`[HOST] UpdateAsync END: ${key}`);
			return <T>result;
		} catch (err) {
			print(`[HOST] UpdateAsync ERROR: ${key} ->`, err);
			throw err;
		}
	}
}
