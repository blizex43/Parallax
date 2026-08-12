import { Janitor } from "@rbxts/janitor";
import { isPromise } from "shared/utility/t-isA";
type AcceptableJanitorValue = Callback | thread | { Destroy(): void } | RBXScriptConnection | Promise<unknown>;
interface CacheMapType {
	readonly janitor: Janitor;
	readonly promise?: Promise<void>;
}
export abstract class SuperJanitor {
	private static readonly cacheMap: Map<unknown, CacheMapType> = new Map();
	public static set(
		index: unknown,
		value: AcceptableJanitorValue,
		duration?: number,
		delPrevious: boolean = true,
	): void {
		if (delPrevious) {
			const cache = this.getCache(index);
			if (cache) this.delCache(index);
		}
		const janitor = new Janitor();
		const map = <CacheMapType>{
			janitor,
		};
		if (isPromise(value)) janitor.AddPromise(value);
		else janitor.Add(value);
		this.setCache(index, map);
		if (duration) {
			janitor.AddPromise(
				((<Writable<CacheMapType>>map).promise = new Promise<void>(
					(resolve) => task.wait(duration) && resolve(),
				).then(() => this.delCache(index))),
			);
		}
	}

	public static get(index: unknown): Maybe<CacheMapType> {
		return this.getCache(index);
	}

	public static promise(index: unknown): Maybe<Promise<void>> {
		return this.getCache(index)?.promise;
	}

	public static del(index: unknown): void {
		return this.delCache(index);
	}

	private static getCache(index: unknown): Maybe<CacheMapType> {
		return this.cacheMap.get(index);
	}

	private static setCache(index: unknown, map: CacheMapType): void {
		return void this.cacheMap.set(index, map);
	}
	private static delCache(index: unknown): void {
		const cache = this.getCache(index);
		if (cache && cache.promise && cache.promise.getStatus() === "Started") cache.promise.cancel();
		if (cache && cache.janitor) cache.janitor.Destroy();
		return void this.cacheMap.delete(index);
	}
}
