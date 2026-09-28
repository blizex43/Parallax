export function now(sec?: boolean) {
	return sec ? DateTime.now().UnixTimestampMillis / 1000 : DateTime.now().UnixTimestampMillis;
}
/**
 * @description A utility function that checks if a timestamp is within a certain time window.
 * @param n The timestamp to check, preferably milliseconds.
 * @param timeWindow The time window in seconds.
 */
export function isThrottled(n: number, timeWindow: number): boolean {
	return now() - n < timeWindow;
}
