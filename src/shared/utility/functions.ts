/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * @description A utility function that takes in multiple callbacks and executes them all in order.
 * @param callbacks The functions to execute.
 */
export function execMul(...callbacks: Callback[]) {
	for (const callback of callbacks) callback();
}
/**
 * @description A utility function that takes in multiple callbacks and gives you a function that executes them all in order.
 * @param callbacks The functions to execute.
 */
export function bundleExec(...callbacks: Callback[]): Callback {
	return () => execMul(...callbacks);
}

/**
 * @description A utility function that does nothing. Useful for when you need to pass a callback but don't want it to do anything.
 * @param _anything Any number of arguments of any type. This is just to prevent errors when using this function in place of a callback that takes in arguments.
 */
export function noop(..._anything: unknown[]) {}

export function extractMethod<T, X extends keyof T>(obj: T, methodName: X): T[X] {
	return obj[methodName];
}
