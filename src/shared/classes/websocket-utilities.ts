import { Blackboard } from "@rbxts/state-management";
import { subscribe } from "@rbxts/charm";
import Signal from "@rbxts/signal";
import LazyIterator from "@rbxts/lazy-iterator";
import { FlameworkCharms } from "shared/constants";
import type { AtomType } from "shared/structs/atom";
import type {
	BaseStateBlackboard,
	BlackboardNames,
	BlackboardNamesGroup,
	CharmAllocationType,
	StateType,
} from "shared/structs/websocket";
import { isBoolean } from "shared/utility/t-isA";
import { now } from "shared/utility/time";
import { Janitor } from "@rbxts/janitor";

export class WebsocketUtilities {
	public readonly blackboard: Blackboard<Record<BlackboardNames, StateType>>;
	public readonly wsTypes: Record<BlackboardNames, StateType>;
	constructor(private readonly charms: BaseStateBlackboard = FlameworkCharms) {
		this.wsTypes = boardToStateType(this.charms);
		this.blackboard = new Blackboard(this.wsTypes);
	}

	public get<T extends AtomType>(key: BlackboardNames): StateType<T> {
		return <StateType<T>>(<unknown>this.blackboard.Get(key));
	}

	public isAllValue(key: BlackboardNames[], value: boolean): boolean {
		for (const names of key) {
			const charm = <StateType<boolean>>this.blackboard.Get(names);
			if (charm.status !== value) return false;
		}
		return true;
	}

	public destroyAllStateTypes() {
		for (const [, charm] of pairs(this.wsTypes)) charm.__janitor.Destroy();
	}

	public set<T extends AtomType>(key: BlackboardNames, value: T): T {
		const boardValue = this.get<T>(key);
		boardValue.__atom(<T>value);
		return value;
	}

	public setWild(key: string, value: unknown): void {
		const boardValue = <Charm.Atom<number> | Charm.Atom<boolean>>this.getWild(key);
		boardValue(<boolean>value);
	}

	public getWild<T>(key: string): T | undefined {
		return this.blackboard.GetWild<T>(key);
	}

	public getBoardTrayTypeCallback(boards: BlackboardNamesGroup, callType: "Within" | "Without" = "Within") {
		const boardValues = this.boardsToRecord(boards);
		return (values: BlackboardNamesGroup = boards) => {
			for (const value of values)
				if (value in boardValues) {
					if (boardValues[value].status && callType === "Within") return true;
				} else {
					if (callType === "Without") return true;
				}

			return false;
		};
	}

	public getGroupSubscribedSignal<B extends boolean>(
		names: BlackboardNamesGroup,
		sigType: B,
		runType: "Single" | "All" = "Single",
	): Signal<(on: B) => void> {
		const subbedSignal: ReturnType<typeof this.getGroupSubscribedSignal> = new Signal();
		const boardValues = this.boardsToRecord(names);
		for (const [, charm] of pairs(boardValues))
			charm.__janitor.Add(
				charm.changed.Connect((newValue) => {
					if (!isBoolean(newValue)) return;
					if (runType === "Single" && newValue === sigType) return subbedSignal.Fire(newValue);
					if (runType === "All") {
						for (const [, charm] of pairs(boardValues)) if (charm.status !== sigType) return;
						return subbedSignal.Fire(newValue);
					}
				}),
			);
		return subbedSignal;
	}

	public allocateToCharms(groups: CharmAllocationType[]) {
		for (const group of groups) {
			const charm = this.get(group.charm);
			if (!charm) continue;
			charm.__atom(<boolean>group.value);
		}
	}

	public formatToAllocationType(groups: Partial<Record<BlackboardNames, AtomType>>): CharmAllocationType[] {
		const expo: CharmAllocationType[] = [];
		for (const [name, value] of pairs(groups)) {
			expo.push({
				charm: name,
				value,
			});
		}
		return expo;
	}

	private boardsToRecord<BG extends BlackboardNamesGroup>(names: BG): Record<BlackboardNames, StateType> {
		const iterator = LazyIterator.fromArray(names);
		const boardValues: ReturnType<typeof this.boardsToRecord> = <never>{};
		for (const board of iterator.collect()) {
			boardValues[board] = this.get(board);
		}
		return boardValues;
	}
}

function boardToStateType(charmTable: BaseStateBlackboard): Record<BlackboardNames, StateType> {
	const output = <Record<BlackboardNames, StateType>>{};
	for (const [name, charm] of pairs(charmTable)) {
		output[name] = {
			__janitor: new Janitor(),
			__atom: <Charm.Atom<AtomType>>charm,
			status: charm(),
			changed: new Signal(),
			lastModified: 0,
		};
		const cleanup = subscribe(<Charm.Atom<AtomType>>charm, (newValue, oldValue) => {
			(<Writable<StateType<AtomType>>>output[<"Health">name]).status = newValue;
			(<Writable<StateType<AtomType>>>output[<"Health">name]).lastModified = now();
			(<StateType<AtomType>>output[<"Health">name]).changed.Fire(newValue, oldValue);
		});
		output[name].__janitor.Add(() => output[name].changed.Destroy());
		output[name].__janitor.Add(() => cleanup());
	}

	return output;
}
