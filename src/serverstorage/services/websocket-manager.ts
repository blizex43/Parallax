import { Service } from "@flamework/core";
import type { WebsocketService } from "./websocket";
import type { AtomType, CooldownAtom, DependerAtom } from "shared/structs/atom";
import { BlackboardNames, StateType } from "shared/structs/websocket";
import { SuperJanitor } from "shared/classes/super-janitor";
import { WebsocketUtilities } from "shared/classes/websocket-utilities";
import { isCooldownAtom, isDependerAtom, isPlayer } from "shared/utility/t-isA";
import Object, { isEmpty } from "@rbxts/object-utils";
import { now } from "shared/utility/time";
import type { CastableNameType } from "shared/structs/cast";
import { CastEnums } from "shared/enums/cast-enum";
import { CombatState } from "shared/enums/config-enum";
import type { GUIDService } from "./guid";
import type Signal from "@rbxts/signal";
// @Service()
export class WebsocketManagementService {
	public constructor(
		private readonly ws: WebsocketService,
		private readonly guid: GUIDService,
	) {}

	public setState(plaracter: Plaracter, index: BlackboardNames, value: AtomType): boolean {
		const charm = this.getCharm(plaracter, index);
		if (!charm) return false;
		charm.__atom(<boolean>value);
		return true;
	}

	public setStateFor<T extends AtomType>(
		plaracter: Plaracter,
		index: BlackboardNames,
		value: T,
		duration: number,
		endValue: T,
		cancelLast?: boolean,
	): void {
		const indexName = `${this.guid.get(plaracter)}${index}`;
		if (cancelLast) SuperJanitor.del(indexName);
		SuperJanitor.set(indexName, () => this.setState(plaracter, index, endValue), duration);
		this.setState(plaracter, index, value);
	}

	public getLastModified(plaracter: Plaracter, index: BlackboardNames, seconds?: boolean): Maybe<number> {
		const charm = this.getCharm(plaracter, index);
		if (!charm) return;
		return seconds ? charm.lastModified / 1000 : charm.lastModified;
	}

	public getLastModifiedFromNow(plaracter: Plaracter, index: BlackboardNames, seconds?: boolean): Maybe<number> {
		const charm = this.getCharm(plaracter, index);
		if (!charm) return;
		const time = now();
		return seconds ? (time - charm.lastModified) / 1000 : time - charm.lastModified;
	}

	public getChangedSignal(plaracter: Plaracter, index: BlackboardNames): Maybe<Signal> {
		return this.getCharm(plaracter, index)?.changed;
	}

	/**
	 * Returns `true` if the state is empty, returns false if state is populated.
	 */
	public getDependerTrueStateValue(plaracter: Plaracter, index: BlackboardNames): boolean {
		const charm = this.getCharm<DependerAtom>(plaracter, index);
		if (!charm || !isDependerAtom(charm.status)) return false;
		return isEmpty(charm.status);
	}

	/**
	 * Returns `true` if the state is empty, returns false if state is populated.
	 */
	public getCooldownTrueStateValue(plaracter: Plaracter, index: BlackboardNames, name: string): boolean {
		const charm = this.getCharm<CooldownAtom>(plaracter, index);
		if (!charm || !isCooldownAtom(charm.status)) return false;
		return name in charm.status;
	}

	public addValueToTableState(
		plaracter: Plaracter,
		index: BlackboardNames,
		name: string,
		duration?: number,
		cancelLast?: boolean,
	): void {
		const charm = this.getCharm<DependerAtom>(plaracter, index);
		if (!charm) return;
		const indexName = `${this.guid.get(plaracter)}${index}${name}`;
		if (cancelLast) SuperJanitor.del(indexName);
		if (duration)
			SuperJanitor.set(
				indexName,
				task.delay(duration, () => this.delValueFromTableState(plaracter, index, name, cancelLast)),
				duration,
			);
		if (isDependerAtom(charm.status) || (isCooldownAtom(charm.status) && duration))
			this.updateTableState(<never>charm, name, {
				start: os.clock(),
				end: duration ? os.clock() + duration : undefined,
				halted: isCooldownAtom(charm.status) ? false : undefined,
			});
	}

	public delValueFromTableState(
		plaracter: Plaracter,
		index: BlackboardNames,
		name: string,
		cancelLast?: boolean,
	): void {
		const charm = this.getCharm<DependerAtom>(plaracter, index)!;
		if (!charm || (!isDependerAtom(charm.status) && !isCooldownAtom(charm.status))) return;
		const indexName = `${plaracter.Name}${index}${name}`;
		if (cancelLast) SuperJanitor.del(indexName);
		this.updateTableState(<never>charm, name);
	}

	public getStateValue<T extends AtomType>(plaracter: Plaracter, index: BlackboardNames): Maybe<T> {
		return this.getCharm<T>(plaracter, index)?.status;
	}

	public getCharm<T extends AtomType>(plaracter: Plaracter, index: BlackboardNames): Maybe<StateType<T>> {
		const manager = this.getManager(plaracter);
		if (!manager) return;
		const charm = manager.get<T>(index);
		return charm;
	}

	public getManager(plaracter: Plaracter): Maybe<WebsocketUtilities> {
		return isPlayer(plaracter)
			? this.ws.getPlayerWebsocketUtilities(plaracter)
			: this.ws.getWebsocketUtilities(plaracter);
	}

	public hasEnum(plaracter: Plaracter, alias: CastableNameType): boolean {
		if (!this.getManager(plaracter)) return false;
		for (const enums of CastEnums)
			if (enums.name === alias)
				for (const names of enums.castables)
					if (this.getStateValue<boolean>(plaracter, <CombatState.Attacking>names)) return true;

		return false;
	}

	private updateTableState(charm: StateType<DependerAtom | CooldownAtom>, index: string, value?: object): void {
		charm.__atom((dependers) => {
			const clone = Object.deepCopy(<CooldownAtom>dependers);
			if (!value) delete clone[index];
			else clone[index] = <never>value;
			return clone;
		});
	}
}
