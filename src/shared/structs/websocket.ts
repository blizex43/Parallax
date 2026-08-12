import type { FlameworkCharms } from "shared/constants";
import type { AtomType } from "./atom";
import type Signal from "@rbxts/signal";
import type { Blackboard } from "@rbxts/state-management";
import { Janitor } from "@rbxts/janitor";
export type BaseStateBlackboard = typeof FlameworkCharms;
export type StateType<T extends AtomType = AtomType> = {
	/**
	 * Readonly backend cleaner
	 */
	readonly __janitor: Janitor;
	/**
	 * Readonly manual state viewer/changer
	 */
	readonly __atom: Charm.Atom<T>;
	/**
	 * Current Charm Value According to AtomType<T>
	 */
	readonly status: T;
	/**
	 * Signal for when the charm value has changed
	 */
	readonly changed: CharmChangedType<T>;
	/**
	 * Last time in milliseconds that the state charm has been modified
	 */
	readonly lastModified: number;
};
export type CharmChangedType<T> = Signal<(newValue: T, oldValue: T) => void>;
export type BlackboardNames = keyof BaseStateBlackboard;
export type BlackboardNamesGroup = BlackboardNames[];
export type BlackboardStateType = Blackboard<Record<BlackboardNames, StateType>>;
export interface CharmAllocationType {
	charm: BlackboardNames;
	value: AtomType;
}
