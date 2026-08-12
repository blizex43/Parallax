/**
 *  @description A utility function that performs a for loop over an array and executes a callback for each value.
 *  @param iterationObject The array to iterate over.
 *  @param callback The function to execute for each value in the array.
 */
export async function forLoopArrayExpression<T, R>(
	iterationObject: T[],
	callback: (value: T) => Promise<R>,
): Promise<Maybe<R>> {
	for (const value of iterationObject) {
		const response = await callback(value).catch((err) => {
			throw err;
		});
		if (response) return <R>response;
	}
	return;
}
