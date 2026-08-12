import Signal from "@rbxts/signal";
import { BlackboardNames, BlackboardNamesGroup, StateType } from "shared/structs/websocket";
import { AtomType } from "shared/structs/atom";
export interface CharmMethods {
	blacklist?: {
		call: (names: BlackboardNamesGroup, type?: "Within" | "Without") => (value?: BlackboardNamesGroup) => boolean;
		names: BlackboardNamesGroup;
		type?: "Within" | "Without";
	};
	whitelist?: {
		call: (names: BlackboardNamesGroup, type?: "Within" | "Without") => (value?: BlackboardNamesGroup) => boolean;
		names: BlackboardNamesGroup;
		type?: "Within" | "Without";
	};
	override?: {
		call: (
			names: BlackboardNamesGroup,
			sigType: boolean,
			runType?: "Single" | "All",
		) => Signal<(on: boolean) => void>;
		names: BlackboardNamesGroup;
		type: boolean;
		runType?: "Single" | "All";
	};

	overrideEnd?: {
		call: (
			names: BlackboardNamesGroup,
			sigType: boolean,
			runType?: "Single" | "All",
		) => Signal<(on: boolean) => void>;
		names: BlackboardNamesGroup;
		type: boolean;
		runType?: "Single" | "All";
	};

	restartCharmOnSignal?: {
		charm: StateType;
	};
}
export abstract class CharmHandler<T extends AtomType = AtomType> {
	protected __signal: Signal = new Signal();
	public abstract charm: StateType<T>;
	private baseCharmValue: AtomType;
	protected isBlacklisted: (value?: BlackboardNamesGroup) => boolean = () => false;
	protected isWhitelisted: (value?: BlackboardNamesGroup) => boolean = () => false;
	constructor(WebsocketController: (key: BlackboardNames) => StateType<T>, state: BlackboardNames) {
		const charm = WebsocketController(state);
		this.baseCharmValue = charm.__atom();
		this.setCharm(charm);
	}

	protected giveCharmMethods(methods: CharmMethods) {
		if ("blacklist" in methods)
			this.isBlacklisted = (<Required<CharmMethods>>methods).blacklist.call(
				methods.blacklist!.names,
				methods.blacklist!.type,
			);
		if ("whitelist" in methods)
			this.isWhitelisted = (<Required<CharmMethods>>methods).whitelist.call(
				methods.whitelist!.names,
				methods.whitelist!.type,
			);
		if ("override" in methods) {
			const signal = (<Required<CharmMethods>>methods).override.call(
				methods.override!.names,
				methods.override!.type,
				methods.override!.runType,
			);
			signal.Connect((on: boolean) => this.onOverride?.(on));
		}

		if ("overrideEnd" in methods) {
			const signal = (<Required<CharmMethods>>methods).overrideEnd.call(
				methods.overrideEnd!.names,
				methods.overrideEnd!.type,
				methods.overrideEnd!.runType,
			);
			signal.Connect((on: boolean) => this.onOverride?.(on));
		}

		if ("restartCharmOnSignal" in methods) {
			this.__signal.Connect(() => methods.restartCharmOnSignal!.charm.__atom(<boolean>this.baseCharmValue));
		}
	}

	private setCharm(charm: StateType<T>): void {
		this.charm = charm;
	}
	protected onOverride?(on: boolean): void;
}
