export abstract class ClientDebugger {
	abstract readonly folder?: Folder;
	abstract onDebug(on: boolean): void;
	abstract _start(...args: unknown[]): void;
	abstract _end(...args: unknown[]): void;

}
