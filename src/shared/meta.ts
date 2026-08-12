import type { MetaType } from "shared/structs/meta";
import { now } from "./utility/time";

export class Meta {
	private static readonly metaname = "__meta";
	public static fill<T extends object>(object: T): T {
		if (!this.hasMeta(object)) (<MetaType>object)["__meta"] = <MetaType[typeof this.metaname]>{};
		const metaTable = (<MetaType>object)[this.metaname];
		metaTable._time = now();
		return object;
	}

	public static hasMeta<T extends object>(object: T) {
		return this.metaname in object;
	}
}
