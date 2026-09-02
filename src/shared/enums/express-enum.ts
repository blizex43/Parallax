import type { ExpressConfiguration, ExpressMetadata } from "shared/structs/express";

export const defaultExpressConfiguration: ExpressConfiguration = {
	delay: 0,
	loopAmount: 0,
	threadCap: 5,
};

export const defaultExpressMetadata: ExpressMetadata = {
	startTick: 0,
	loops: 0,
	threads: 0,
	queued: 0,
	threadCap: 5,
};
