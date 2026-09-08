export interface JobConfiguration {
	id: string;
	callback: Callback;
	popOnEnd?: boolean;
	args?: unknown[];
	delay?: number;
	loopAmount?: number;
}

export interface ExpressMetadata {
	jobs: number;
}

export interface JobCoreData<T = unknown> {
	promise: Promise<T>;
	thread: thread;
}

export type JobStatus = "Running" | "Finished" | "Cancelled" | "Not Started";
