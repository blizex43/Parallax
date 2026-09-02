import Signal from "@rbxts/signal";
import { defaultExpressMetadata, defaultExpressConfiguration } from "shared/enums/express-enum";
import type { ExpressConfiguration, ExpressCoreData, ExpressMetadata } from "shared/structs/express";
import { Reconcile, ReconcileUnadded } from "shared/utility/instance";
function expressError(message: string): never {
	throw `Express Error: ${message}`;
}
export abstract class ExpressMetadataCollector {
	protected abstract readonly metadata: ExpressMetadata;
	protected write<M extends keyof ExpressMetadata, V extends ExpressMetadata[M]>(metaname: M, value: V) {
		this.metadata[metaname] = value;
	}

	protected read<M extends keyof ExpressMetadata, T extends ExpressMetadata[M]>(metaname: M): T {
		return <T>this.metadata[metaname];
	}
}

export class Express extends ExpressMetadataCollector {
	protected readonly metadata: ExpressMetadata = <ExpressMetadata>Reconcile({}, defaultExpressMetadata, false);
	private readonly threads: Map<string, ExpressCoreData> = new Map();
	private readonly queuedThreads: Map<string, Callback> = new Map();
	private readonly configuration: ExpressConfiguration;
	public readonly ended: Signal<(result: unknown) => void> = new Signal();
	public readonly looped: Signal = new Signal();

	public constructor(configuration: Partial<ExpressConfiguration> = {}) {
		super();
		ReconcileUnadded(configuration, defaultExpressConfiguration);
		this.appendConfigurationToMetadata(<ExpressConfiguration>configuration);
		this.configuration = <ExpressConfiguration>configuration;
	}

	public start(key?: string): ExpressCoreData | void {
		if (key) {
			const queuedThread = this.queuedThreads.get(key);
			if (!queuedThread) return expressError(`No queued thread found with key ${key}.`);
			return this.createAndRunCoreData(key, queuedThread);
		} else for (const [name, callback] of this.queuedThreads) this.createAndRunCoreData(name, callback);
	}

	public add(key: string, value: Callback): void {
		if (this.metadata.threads >= this.configuration.threadCap) {
			expressError(`Thread cap of ${this.configuration.threadCap} reached. Cannot add thread ${key}.`);
		}
		this.queuedThreads.set(key, value);
		return this.write("queued", this.queuedThreads.size());
	}

	public has(key: string): boolean {
		return this.threads.has(key) || this.queuedThreads.has(key);
	}

	public get(key: string): Maybe<ExpressCoreData> {
		return this.threads.get(key);
	}

	public remove(key: string, kill: boolean = false): void {
		const existingThread = this.threads.get(key);
		if (existingThread && coroutine.status(existingThread.thread) !== "dead") {
			if (kill) {
				coroutine.close(existingThread.thread);
			}
			return;
		}
		this.threads.delete(key);
		return void this.queuedThreads.delete(key);
	}

	public destroy(): void {
		for (const [key, coreData] of this.threads) {
			if (coroutine.status(coreData.thread) !== "dead") coroutine.close(coreData.thread);
			this.threads.delete(key);
		}
		for (const [key] of this.queuedThreads) this.queuedThreads.delete(key);
	}

	private createPromiseEnvironment<T>(callback: Callback): Promise<T> {
		// eslint-disable-next-line no-async-promise-executor
		return new Promise(async (resolve) => {
			let loops = 0;
			let output: T;
			do {
				loops++;
				if (loops !== 1) this.looped.Fire();

				this.write("loops", this.read("loops") + 1);
				output = await callback();
			} while (loops <= this.configuration.loopAmount);
			this.ended.Fire(output);
			return resolve(output);
		});
	}

	private createAndRunCoreData(key: string, callback: Callback): ExpressCoreData {
		this.queuedThreads.delete(key);
		const core = this.createCoreData(callback);
		this.threads.set(key, core);
		this.write("threads", this.read("threads") + 1);
		coroutine.resume(core.thread);
		return core;
	}

	private createCoreData(callback: Callback): ExpressCoreData {
		const core = this.createPromiseEnvironment(callback);
		return {
			core,
			thread: coroutine.create(async () => await core),
		};
	}

	private appendConfigurationToMetadata(configuration: ExpressConfiguration) {
		for (const [metaKey] of pairs(this.metadata)) {
			if (metaKey in configuration)
				this.write(
					metaKey,
					<ExpressMetadata[keyof ExpressMetadata]>configuration[<keyof ExpressConfiguration>metaKey],
				);
		}
	}
}
