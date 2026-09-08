/**
 * @description A utility function that takes in a value to compare and returns if x is equal to any of the arguements.
 * @param x The value to compare.
 * @param args The values to compare against.
 */
export function isEqualToMassOperation(x: unknown, ...args: unknown[]): boolean {
	return (<defined[]>args).some((arg) => arg === x);
}
