export interface ExpressConfiguration {
	delay: number;
	loopAmount: number;
	threadCap: 5;
}

export interface ExpressMetadata {
	threads: number;
	queued: number;
	threadCap: number;
	startTick: number;
	loops: number;
}

export interface ExpressCoreData {
	core: Promise<unknown>;
	thread: thread;
}
