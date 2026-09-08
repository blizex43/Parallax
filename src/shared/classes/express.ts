/* eslint-disable no-async-promise-executor */
import Signal from "@rbxts/signal";
import { defaultExpressMetadata } from "shared/enums/express-enum";
import type { ExpressMetadata, JobConfiguration, JobCoreData, JobStatus } from "shared/structs/express";
import { isEqualToMassOperation } from "shared/utility/cases";
import { Reconcile } from "shared/utility/instance";
export class ExpressMetadataCollector {
	constructor(protected readonly metadata: ExpressMetadata) {}
	public write<M extends keyof ExpressMetadata, V extends ExpressMetadata[M]>(metaname: M, value: V) {
		this.metadata[metaname] = value;
	}

	public read<M extends keyof ExpressMetadata, T extends ExpressMetadata[M]>(metaname: M): T {
		return <T>this.metadata[metaname];
	}
}

export class Job<T = unknown> {
	private currentTask: Maybe<JobCoreData<T>>;
	public readonly statusChanged: Signal<(newStatus: JobStatus, oldStatus: JobStatus) => void> = new Signal();
	private readonly lastJobValue: Maybe<T>;
	private readonly status: JobStatus = "Not Started";
	public readonly id: string;
	constructor(public readonly configuration: JobConfiguration) {
		this.id = configuration.id;
	}

	public start(): Promise<T> {
		this.currentTask = this.constructJobThreadAndPromise<T>();
		if (this.configuration.delay) task.wait(this.configuration.delay);
		coroutine.resume(this.currentTask.thread);
		this.changeStatus("Running");
		return this.currentTask.promise;
	}

	public end(): void {
		if (!this.currentTask) return;
		if (coroutine.status(this.currentTask.thread) !== "dead") coroutine.close(this.currentTask.thread);
		this.changeStatus("Cancelled");
	}

	public getLastJobResult(): Maybe<Promise<T>> {
		if (this.lastJobValue) return <Promise<T>>(<unknown>this.lastJobValue);
		return this.currentTask?.promise;
	}

	public getStatus(): JobStatus {
		return this.status;
	}

	private constructJobPromise<P>(): Promise<P> {
		return new Promise<P>(async (resolve) => {
			const response = await this.configuration.callback(...(this.configuration.args ?? []));
			return resolve(response);
		});
	}

	private constructJobThreadAndPromise<P>(): JobCoreData<P> {
		const core = <JobCoreData<P>>{};
		core.thread = coroutine.create(async () => {
			let loops = 0;
			do {
				core.promise = this.constructJobPromise<P>();
				(<Awaited<P>>(<unknown>this.lastJobValue)) = await core.promise;
				loops++;
			} while (loops <= (this.configuration.loopAmount ?? 0));
			this.changeStatus("Finished");
		});
		return core;
	}

	private changeStatus(newStatus: JobStatus): void {
		const oldStatus = this.status;
		(<JobStatus>this.status) = newStatus;
		if (oldStatus !== newStatus) this.statusChanged.Fire(newStatus, oldStatus);
	}
}
export abstract class Express {
	private static readonly metadata: ExpressMetadata = <ExpressMetadata>Reconcile({}, defaultExpressMetadata, false);
	private static readonly collector: ExpressMetadataCollector = new ExpressMetadataCollector(this.metadata);
	private static readonly previousJobArgHistory: Map<string, unknown[]> = new Map();
	private static readonly jobs: Map<string, Job> = new Map();
	public static has(key: string): boolean {
		return this.jobs.has(key);
	}

	public static get<T>(key: string): Maybe<Job<T>> {
		return <Maybe<Job<T>>>this.jobs.get(key);
	}

	public static remove(key: string, kill: boolean = false): void {
		const job = this.get(key);
		if (job && job.getStatus() !== "Finished" && kill) job.end();
		this.jobs.delete(key);
		this.collector.write("jobs", this.jobs.size());
	}
	public static createJob<T = unknown>(configuration: JobConfiguration): Job<T> {
		const job = new Job<T>(configuration);
		this.jobs.set(job.id, job);
		this.collector.write("jobs", this.jobs.size());
		this.previousJobArgHistory.set(configuration.id, configuration.args ?? []);
		if (configuration.popOnEnd) {
			const connection = job.statusChanged.Connect((status) => {
				if (!isEqualToMassOperation(status, "Finished", "Cancelled")) return;
				connection.Disconnect();
				this.remove(job.id);
			});
		}
		return job;
	}

	public static createJobWithDecorator<I extends unknown[] = unknown[], V = unknown>(
		id: string,
		activateWhenRunningOnly: boolean = false,
	) {
		return (
			ctor: object,
			propertyKey: string,
			descriptor: TypedPropertyDescriptor<(this: unknown, ...input: I) => Promise<V>>,
		) => {
			const object = <Record<string, Callback>>ctor;
			const originalMethod = descriptor.value!;
			object[propertyKey] = async function (this: unknown, ...args: I) {
				const previousJob = Express.get(id);
				const previousArgs = <defined[]>Express.previousJobArgHistory.get(id);
				const enabledLastResult =
					(activateWhenRunningOnly && previousJob && previousJob.getStatus() === "Running") ?? true;
				if (previousJob && previousArgs) {
					let matched = 0;
					for (const arg of args) {
						if (previousArgs.includes(<defined>arg)) matched++;
					}
					if (matched === args.size() && enabledLastResult) return await previousJob.getLastJobResult();
				}
				const job = Express.createJob({ id, callback: originalMethod, args: [this, ...args] });
				return await job.start();
			};
		};
	}
}
