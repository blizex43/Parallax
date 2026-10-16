import { OnTick, Service } from "@flamework/core";
import { Brain } from "serverstorage/components/brain";
import type { Memories } from "shared/structs/brain";

interface ScheduledBrain {
	brain: Brain;
	dueAt: number;
	active: boolean;
}

@Service()
export class AIService implements OnTick {
	private readonly brains = new Map<CharacterModel, ScheduledBrain>();
	private readonly queue: ScheduledBrain[] = [];

	public install(host: CharacterModel, memories: Memories): Brain {
		this.uninstall(host);
		const brain = Brain.create(host);
		brain.initiate(memories);
		const entry: ScheduledBrain = {
			brain,
			dueAt: os.clock() + brain.electricity.getPollingInterval(memories.mastery) * math.random(),
			active: true,
		};
		this.brains.set(host, entry);
		this.push(entry);
		return brain;
	}

	public uninstall(host: CharacterModel): void {
		const entry = this.brains.get(host);
		if (!entry) return;
		entry.active = false;
		entry.brain.shutdown();
		this.brains.delete(host);
	}

	public onTick(): void {
		const now = os.clock();
		while (this.queue[0] && this.queue[0].dueAt <= now) {
			const entry = this.pop();
			if (!entry || !entry.active || this.brains.get(entry.brain.instance) !== entry) continue;
			if (!entry.brain.instance.Parent) {
				this.uninstall(entry.brain.instance);
				continue;
			}
			pcall(() => entry.brain.process());
			const memories = entry.brain.memories;
			if (!memories) {
				this.uninstall(entry.brain.instance);
				continue;
			}
			entry.dueAt = now + entry.brain.electricity.getPollingInterval(memories.mastery);
			this.push(entry);
		}
	}

	private push(entry: ScheduledBrain): void {
		let index = this.queue.size();
		this.queue.push(entry);
		while (index > 0) {
			const parent = math.floor((index - 1) / 2);
			if (this.queue[parent].dueAt <= entry.dueAt) break;
			this.queue[index] = this.queue[parent];
			index = parent;
		}
		this.queue[index] = entry;
	}

	private pop(): Maybe<ScheduledBrain> {
		const first = this.queue[0];
		const last = this.queue.pop();
		if (!first || !last || this.queue.isEmpty()) return first;
		let index = 0;
		while (true) {
			const left = index * 2 + 1;
			const right = left + 1;
			if (left >= this.queue.size()) break;
			const child = right < this.queue.size() && this.queue[right].dueAt < this.queue[left].dueAt ? right : left;
			if (this.queue[child].dueAt >= last.dueAt) break;
			this.queue[index] = this.queue[child];
			index = child;
		}
		this.queue[index] = last;
		return first;
	}
}
