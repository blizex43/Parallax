import { type OnTick, Service } from "@flamework/core";
import type { AIData } from "shared/structs/ai";
import type { RegisterService } from "./register";

@Service()
export class AiHandlerService implements OnTick {
	public readonly npcAI: Map<CharacterModel, AIData> = new Map();
	constructor(private readonly registerService: RegisterService) {}
	public onTick(dt: number): void {
		if (this.npcAI.size() < 1) return;
		for (const [, data] of this.npcAI) data.fsm?.Update(dt);
	}

	public handle(character: CharacterModel, data: AIData): void {
		if (!this.npcAI.get(character)) this.npcAI.set(character, data);
		this.register(character);
	}

	public get(character: CharacterModel): Maybe<AIData> {
		return this.npcAI.get(character);
	}

	public halt(character: CharacterModel): void {
		const data = this.get(character);
		if (data) {
			this.registerService.del(character);
			this.npcAI.delete(character);
		}
	}

	private register(character: CharacterModel): void {
		return void this.registerService.set(character);
	}
}
