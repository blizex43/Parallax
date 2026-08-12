const { floor, round, abs, clamp } = math;

export const isNaN = (n: number) => n !== n;
export const isEven = (n: number) => n % 2 === 0;
export const isNegative = (n: number) => n < 0;
/**
 * Clamps `n` between `-limit` and `limit`, inclusive
 */
export function doubleSidedLimit(n: number, limit: number): number {
	return clamp(n, -limit, limit);
}

/**
 * Returns 0 if `n` is close enough to 0 by `epsilon`
 * @param n
 * @param epsilon
 */
export function zeroIfClose(n: number, epsilon = 0.001): number {
	return abs(n) <= epsilon ? 0 : n;
}

/**
 * Rounds `n` to the nearest 5 or 10
 * @example toNearestFiveOrTen(7) // 10
 */
export function toNearestFiveOrTen(n: number): number {
	const nearestFive = round(n / 5) * 5;
	const lowerTen = floor(nearestFive / 10) * 10;
	const upperTen = lowerTen + 10;

	if (abs(n - lowerTen) <= abs(n - nearestFive)) return lowerTen;
	else if (abs(n - upperTen) <= abs(n - nearestFive)) return upperTen;

	return nearestFive;
}

/**
 * Rounds `n` to the nearest `digits` digits
 * @example roundDecimal(10.45687, 2) // 10.46
 */
export function roundDecimal(n: number, digits: number): number {
	const mult = 10 ** digits;
	return floor(n * mult + 0.5) / mult;
}

/**
 * Transforms `n` (milliseconds) to seconds
 * @example millisecondsToSeconds(1000) // 1
 */
export function millisecondsToSeconds(n: number): number {
	return n / 1000;
}

/**
 * Transforms `n` (milliseconds) to seconds
 * @example secondsToMilliseconds(1) // 1000
 */
export function secondsToMilliseconds(n: number): number {
	return n * 1000;
}

/**
 * Simple Division. Gets the division of every number of total
 * @example forNumberOfTotal(1000, 30) // For every 30 stats of your total is 1 TP: 33.3
 */
export function forNumberOfTotal(t: number, n: number): number {
	return t / n;
}

/**
 * Returns `underdog`% of `highest`
 * @example getPercentOf(2000, 13) // 260
 */
export function getPercentOf(highest: number, underdog: number): number {
	return (underdog / 100) * highest;
}

/**
 * Gets the percentage of `underdog` from the reference `highest`
 * @example getPercentOf(2000, 13) // 0.65
 */
export function getPercent(highest: number, underdog: number): number {
	return (underdog / highest) * 100;
}

/**
 * Gathers every number inputted and adds them all up
 * @example sum(50, 70, 20, 60) // 200
 */
export function sum(...n: number[]): number {
	return n.reduce((accumulator, current) => accumulator + current, 0);
}

/**
 * Returns true if `n` is between `lower` and `higher`
 *
 * If `strict` isn't ommited, Returns true if `n` is strictly between instead of clamped
 * @example isBetween(5, 1, 5) // true
 * isBetween(5, 1, 5, true) // false
 */
export function isBetween(n: number, lower: number, higher: number, strict: boolean = false): boolean {
	return strict ? n > lower && n < higher : n >= lower && n <= higher;
}

//// Scaling

/**
 * Returns a scaled number which first scales `n` per every `p` emit the set number `increment`
 *
 * If `min` isn't ommited, if `n` isn't above the `min` amount, it will return 0.
 *
 * If `max` isn't ommited, if `n` is above the `max` amount, it will return the scaled number to the original max value.
 *
 * If `trueScale` isn't ommited, if `n` is above `min`, the scaling will start as if `min` wasn't there. If `trueScale` is ommited, the scaling will start right after `min` is reached.
 *
 * @example scaleNumberWithPer(1000, 5, 1) // If you have 1000 strength and you get 1 strength per 5 stats, you would deal '200' damage.
 * scaleNumberWithPer(100, 5, 1, 200) // 0
 * scaleNumberWithPer(300, 5, 1, 200) // 20
 * scaleNumberWithPer(300, 5, 1, 200, undefined, true) // 60
 * scaleNumberWithPer(500, 5, 1, 200, 500) // 100
 * scaleNumberWithPer(600, 5, 1, 200, 500) // 100
 */
export function scaleNumberWithPer(
	n: number,
	per: number,
	increment: number,
	min?: number,
	max?: number,
	trueScale?: boolean,
	startValue: number = 0,
): number {
	n += startValue;
	if (max) {
		n = math.min(n, max);
	}
	if (min && n < min) {
		return startValue;
	}
	if (min && !trueScale) {
		n -= min;
	}

	return (n / per) * increment;
}
