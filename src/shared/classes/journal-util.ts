import type { StateManager } from "@rbxts/action-journal";
import Signal from "@rbxts/signal";
import Log from "shared/log";
import type { GameState, JournalInfoMeta, JournalSignalType } from "shared/structs/journal";
import { isObject } from "shared/utility/t-isA";
import { now } from "shared/utility/time";
import { Express } from "./express";

export class JournalUtil<J extends StateManager<GameState> = StateManager<GameState>> {
	private readonly infoEntries: Map<string, JournalInfoMeta> = new Map();
	constructor(private readonly journal: J) {
		this.createInfoContainerForJournal();
	}
	public getFullPathOfEntry(chunk: string): Maybe<string> {
		const iter = (obj: object, currentPath: string = ""): Maybe<string> => {
			let path: Maybe<string>;
			for (const [key, value] of pairs(obj)) {
				if (key === chunk) return `${currentPath}${key}`;
				if (isObject(value)) path = iter(value, `${currentPath}${key}/`);
				if (path) break;
			}
			return path;
		};
		const raw = this.journal.initial;
		return iter(raw);
	}

	public write<T>(chunkOrPath: string, value: T, author = "unknown"): void {
		const path = this.resolvePathOrChunkToPath(chunkOrPath);
		if (!path) throw Log.fatal(`Failed to find path for chunk/path: ${chunkOrPath}`);
		this.set(path, value, author);
	}

	public writeFor<T>(
		chunkOrPath: string,
		value: T,
		duration: number,
		valueAfter: T,
		overwritable: boolean = true,
		author = "unknown",
	): Promise<void> {
		const path = this.resolvePathOrChunkToPath(chunkOrPath);
		if (!path) throw Log.fatal(`Failed to find path for chunk/path: ${chunkOrPath}`);
		if (Express.has(path) && overwritable) {
			Express.remove(path, true);
		}
		const job = Express.createJob<void>({
			id: path,
			callback: () => {
				this.write(path, value, author);
				task.wait(duration);
				this.write(path, valueAfter, author);
			},
			popOnEnd: true,
		});
		return job.start();
	}

	public writeRecord<T>(chunkOrPath: string, key: string, value: T, author = "unknown"): void {
		const path = this.resolvePathOrChunkToPath(chunkOrPath);
		if (!path) throw Log.fatal(`Failed to find path for chunk/path: ${chunkOrPath}`);
		const entry = this.read<Record<string, never>>(path);
		if (!entry) throw Log.fatal(`Failed to find entry for path: ${path}`);
		entry[key] = <never>value;
		this.set(path, entry, author);
	}

	public writeRecordFor<T>(
		chunkOrPath: string,
		key: string,
		value: T,
		duration: number,
		author = "unknown",
	): Promise<void> {
		const path = this.resolvePathOrChunkToPath(chunkOrPath);
		if (!path) throw Log.fatal(`Failed to find path for chunk/path: ${chunkOrPath}`);
		const jobId = `${path}/${key}`;
		if (Express.has(jobId)) Express.remove(jobId, true);
		const job = Express.createJob<void>({
			id: jobId,
			callback: () => {
				this.writeRecord(path, key, value, author);
				task.wait(duration);
				this.deleteRecord(path, key, author);
			},
			popOnEnd: true,
		});
		return job.start();
	}

	public deleteRecord(chunkOrPath: string, key: string, author = "unknown"): void {
		const path = this.resolvePathOrChunkToPath(chunkOrPath);
		if (!path) throw Log.fatal(`Failed to find path for chunk/path: ${chunkOrPath}`);
		const entry = this.read<Record<string, never>>(path);
		if (!entry) throw Log.fatal(`Failed to find entry for path: ${path}`);
		delete entry[key];
		this.set(path, entry, author);
	}

	public writeEntry<T extends defined>(chunkOrPath: string, value: T, author = "unknown"): void {
		const path = this.resolvePathOrChunkToPath(chunkOrPath);
		if (!path) throw Log.fatal(`Failed to find path for chunk/path: ${chunkOrPath}`);
		const entry = this.read<T[]>(path);
		if (!entry) throw Log.fatal(`Failed to find entry for path: ${path}`);
		entry.push(value);
		this.set(path, entry, author);
	}

	public read<T>(chunkOrPath: string): Maybe<T> {
		const path = this.resolvePathOrChunkToPath(chunkOrPath);
		if (!path) return;
		return this.journal.getPath(path);
	}

	public isPathValuesEqualTo(chunkOrPaths: string[], value: unknown): boolean {
		const paths = chunkOrPaths.map((chunk) => this.resolvePathOrChunkToPath(chunk, true)!);
		for (const path of paths) if (this.read(path) !== value) return false;
		return true;
	}

	public getPathChanged<T>(chunkOrPath: string): Signal<(info: Omit<JournalSignalType<T>, "path">) => void> {
		const path = this.resolvePathOrChunkToPath(chunkOrPath);
		if (!path || !this.validPath(path)) throw Log.fatal(`Path is invalid: ${path}`);
		const signal: Signal<(info: Omit<JournalSignalType<T>, "path">) => void> = new Signal();
		this.journal.whenPathChanged(path, (info) => signal.Fire(<Omit<JournalSignalType<T>, "path">>info));
		return signal;
	}

	public getPathsChanged<T>(chunkOrPaths: string[]): Signal<(info: JournalSignalType<T>) => void> {
		const paths = chunkOrPaths.map((chunk) => this.resolvePathOrChunkToPath(chunk, true)!);
		for (const path of paths) if (!path || !this.validPath(path)) throw Log.fatal(`Path is invalid: ${path}`);
		const signal: Signal<(info: JournalSignalType<T>) => void> = new Signal();
		this.journal.whenChanged((info) => paths.includes(info.path) && signal.Fire(<JournalSignalType<T>>info));
		return signal;
	}

	public getLastWritten(chunkOrPath: string): Maybe<number> {
		const path = this.resolvePathOrChunkToPath(chunkOrPath);
		if (!path) return;
		const meta = this.getMetaFromPath(path);
		if (!meta) return;
		return meta.lastWritten;
	}

	public resolvePathOrChunkToPath<Path extends string>(
		chunkOrPath: string,
		returnAnyway: boolean = false,
	): Maybe<Path> {
		if (this.validPath(chunkOrPath)) return <Path>chunkOrPath;
		const newPath = this.getFullPathOfEntry(chunkOrPath);
		if (newPath) return <Path>newPath;
		else return returnAnyway ? <Path>chunkOrPath : undefined;
	}

	private createInfoContainerForJournal(): void {
		this.journal.whenChanged((info) => {
			const meta = this.getMetaFromPath(info.path) ?? <JournalInfoMeta>{};
			this.setLastWritten(meta);
			this.infoEntries.set(info.path, meta);
		});
	}

	private getMetaFromPath(path: string): Maybe<JournalInfoMeta> {
		return this.infoEntries.get(path);
	}

	private setLastWritten(meta: JournalInfoMeta): void {
		meta.lastWritten = now();
	}

	private validPath(path: string): boolean {
		return this.journal.getPath(path) !== undefined;
	}

	private set(path: string, value: unknown, author: string): void {
		this.journal.setPath(path, <never>value, author);
	}
}
