import type { AtomType, CooldownAtom, DependerAtom } from "shared/structs/atom";
import { BlackboardNames, CharmChangedType, StateType } from "shared/structs/websocket";
import { SuperJanitor } from "shared/classes/super-janitor";
import { Controller } from "@flamework/core";
import type { WebsocketController } from "./state";
import { isCooldownAtom, isDependerAtom, isObjectWithAtLeast } from "shared/utility/t-isA";
import Object from "@rbxts/object-utils";
import { now } from "shared/utility/time";
@Controller()
export class WebsocketManagementController {
	public constructor(private readonly ws: WebsocketController) { }

	public setState(index: BlackboardNames, value: AtomType): boolean {
		const charm = this.getCharm(index);
		charm.__atom(<boolean>value);
		return true;
	}

	public setStateFor<T extends AtomType>(
		index: BlackboardNames,
		value: T,
		duration: number,
		endValue: T,
		cancelLast?: boolean,
	): void {
		const indexName = `${index}`;
		SuperJanitor.set(indexName, () => this.setState(index, endValue), duration, cancelLast);
		this.setState(index, value);
	}

	public getLastModified(index: BlackboardNames, seconds?: boolean): number {
		const charm = this.getCharm(index);
		return seconds ? charm.lastModified / 1000 : charm.lastModified;
	}

	public getLastModifiedFromNow(index: BlackboardNames, seconds?: boolean): number {
		const charm = this.getCharm(index);
		const time = now();
		return seconds ? (time - charm.lastModified) / 1000 : time - charm.lastModified;
	}

	public getChangedSignal<T extends AtomType>(index: BlackboardNames): CharmChangedType<T> {
		return this.getCharm(index).changed;
	}

	/**
	 * Returns `true` if the state is empty, returns false if state is populated.
	 */
	public getDependerTrueStateValue(index: BlackboardNames): boolean {
		const charm = this.getCharm<DependerAtom>(index);
		if (!isDependerAtom(charm.status)) return false;
		return isObjectWithAtLeast(charm.status, 1) ? false : true;
	}

	/**
	 * Returns `true` if the state is empty, returns false if state is populated.
	 */
	public getCooldownTrueStateValue(index: BlackboardNames, name: string): boolean {
		const charm = this.getCharm<CooldownAtom>(index);
		if (!isCooldownAtom(charm.status)) return false;
		return name in charm.status;
	}

	public addValueToTableState(index: BlackboardNames, name: string, duration?: number, cancelLast?: boolean): void {
		const charm = this.getCharm<DependerAtom>(index);
		const indexName = `${index}${name}`;
		if (cancelLast) SuperJanitor.del(indexName);
		if (duration) SuperJanitor.set(indexName, () => this.delValueFromTableState(index, name, cancelLast), duration);
		if (isDependerAtom(charm.status) || (isCooldownAtom(charm.status) && duration))
			this.updateTableState(charm, name, {
				start: os.clock(),
				end: duration ? os.clock() + duration : undefined,
				halted: isCooldownAtom(charm.status) ? false : undefined,
			});
	}

	public delValueFromTableState(index: BlackboardNames, name: string, cancelLast?: boolean): void {
		const charm = this.getCharm<DependerAtom>(index)!;
		if (!isDependerAtom(charm.status) && !isCooldownAtom(charm.status)) return;
		const indexName = `${index}${name}`;
		if (cancelLast) SuperJanitor.del(indexName);
		this.updateTableState(charm, name);
	}

	public isStatesEqualTo(indexes: BlackboardNames[], value: AtomType): boolean {
		for (const index of indexes) if (this.getStateValue(index) !== value) return false;
		return true;
	}

	public getStateValue<T extends AtomType>(index: BlackboardNames): T {
		return this.getCharm<T>(index).status;
	}

	public getCharm<T extends AtomType>(index: BlackboardNames): StateType<T> {
		return this.ws.get(index);
	}

	private updateTableState(charm: StateType<DependerAtom | CooldownAtom>, index: string, value?: object): void {
		charm.__atom((dependers) => {
			const clone = Object.deepCopy(<CooldownAtom>dependers);
			if (!value) clone.delete(index);
			else clone.set(index, <never>value);
			return clone;
		});
	}
}
