import Signal from "@rbxts/signal";

export class Worker {
	private static workers: Record<string, Worker> = {};
	private connection: Maybe<RBXScriptConnection>;
	private signal: Maybe<Signal<(...args: unknown[]) => void>>;
	private tasks: thread[] = [];
	constructor(public readonly name: string) {
		Worker.workers[name] = this;
	}

	public static addTask(workerName: string, ...args: unknown[]): void {
		const worker = Worker.getWorker(workerName);
		if (!worker) return;
		worker.add(...args);
	}

	public static getWorker(name: string): Maybe<Worker> {
		return Worker.workers[name];
	}

	public static destroyWorker(name: string, kill?: boolean): void {
		const worker = Worker.getWorker(name);
		if (!worker) return;
		worker.endJob(kill);
		delete Worker.workers[name];
	}

	public add(...args: unknown[]) {
		this.signal?.Fire(...args);
	}

	public startJob(func: Callback): void {
		this.signal = new Signal();
		this.connection = this.signal.Connect((...args: unknown[]) => this.tasks.push(task.spawn(func, ...args)));
	}

	public endJob(kill?: boolean): void {
		this.connection?.Disconnect();
		if (kill) for (const thread of this.tasks) if (coroutine.status(thread) !== "dead") task.cancel(thread);
	}
}
