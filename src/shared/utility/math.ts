export abstract class advmath {
	/**
	 *  @description Calculates the sigmoid of a number
	 *  @param x The number to calculate the sigmoid of
	 */
	public static sigmoid(x: number): number {
		return 1 / (1 + math.exp(-x));
	}

	/**
	 *  @description Rounds a number to a specified number of decimal places
	 *  @param n The number to round
	 *  @param places The number of decimal places to round to
	 */
	public static round(n: number, places: number = 1): number {
		const factor = math.pow(10, places);
		return math.round(n * factor) / factor;
	}
}
