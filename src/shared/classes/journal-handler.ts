import Signal from "@rbxts/signal";
import type {
	GameState,
	JournalHandlerMethods,
	JournalHandlerMethodsArray,
	JournalSignalType,
} from "shared/structs/journal";
import { JournalUtil } from "./journal-util";
import { StateManager } from "@rbxts/action-journal";

export abstract class JournalHandler {
	private readonly __revertSignal: Signal = new Signal();
	private readonly blacklistContainer: string[] = [];
	private readonly whitelistContainer: string[] = [];
	constructor(protected readonly journalUtil: JournalUtil<StateManager<GameState>>) {}
	protected runMethods(methods: JournalHandlerMethodsArray) {
		for (const method of methods) {
			if (method.paths.isEmpty()) continue;
			if (method.handleType !== "revert")
				this.journalUtil.getPathsChanged(method.paths).Connect((info) => {
					if (!method.paths.includes(info.path)) return;
					this[method.handleType](method, info);
				});
			else {
				const previousValues: Map<string, unknown> = new Map();
				for (const path of method.paths) previousValues.set(path, this.journalUtil.read(path));
				this.__revertSignal.Connect(() => {
					if (method.revertValue)
						for (const path of method.paths) this.journalUtil.write(path, method.revertValue);
					else for (const path of method.paths) this.journalUtil.write(path, previousValues.get(path));
				});
			}
		}
	}

	public revert(): void {
		this.__revertSignal.Fire();
	}

	protected onOverride?(on: boolean): void;

	protected isBlacklisted: (value?: string) => boolean = (value?: string) => {
		if (value) return this.blacklistContainer.includes(value);
		else return !this.blacklistContainer.isEmpty();
	};
	protected isWhitelisted: (value?: string) => boolean = (value?: string) => {
		if (value) return this.whitelistContainer.includes(value);
		else return !this.whitelistContainer.isEmpty();
	};

	private blacklist<T>(method: JournalHandlerMethods, info: JournalSignalType<T>) {
		this.toggle(this.blacklistContainer, method, info);
	}

	private whitelist<T>(method: JournalHandlerMethods, info: JournalSignalType<T>) {
		this.toggle(this.whitelistContainer, method, info);
	}

	private override<T>(method: JournalHandlerMethods, info: JournalSignalType<T>) {
		if (this.evaluateBehavior(method, info)) this.onOverride?.(true);
	}

	private overrideEnd<T>(method: JournalHandlerMethods, info: JournalSignalType<T>) {
		if (this.evaluateBehavior(method, info)) this.onOverride?.(false);
	}

	private toggle<T>(container: string[], method: JournalHandlerMethods, info: JournalSignalType<T>) {
		const active = this.evaluateBehavior(method, info);
		const index = container.indexOf(info.path);
		if (active) {
			if (index === -1) container.push(info.path);
		} else if (index !== -1) {
			container.remove(index);
		}
	}

	private evaluateBehavior<T>(method: JournalHandlerMethods, info: JournalSignalType<T>): boolean {
		const { paths, behavior } = method;
		switch (behavior) {
			case "Run If All True":
				return paths.every((path) => this.journalUtil.read<boolean>(path));
			case "Run If All False":
				return paths.every((path) => !this.journalUtil.read<boolean>(path));
			case "Run If Single True":
				return info.newValue === true;
			case "Run If Single False":
				return info.newValue === false;
			default:
				return false;
		}
	}
}
