export function getRandomArrayValue<T>(array: T[]): T {
	return array[math.random(1, array.size()) - 1];
}
