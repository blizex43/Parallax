export function infoFormat(msg: string): string {
	return `[roSQL][%s] %s`.format(`INFO`, msg);
}

export function errorFormat(msg: string): string {
	return `[roSQL][%s] %s\n%s => %s`.format("ERROR", msg, "TRACEBACK", debug.traceback());
}
