export function proto<T extends object>(thisParameter: T): T {
	return <T>getmetatable(thisParameter);
}
