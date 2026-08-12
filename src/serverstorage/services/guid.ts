import { Service } from "@flamework/core";
import { HttpService as http } from "@rbxts/services";
import { OnNPCDestroyed, OnNPCMade } from "serverstorage/hooks";
import type { OnCharacterAdd, OnCharacterRemove } from "shared/hooks";
import { NPCType } from "shared/structs/npc";
@Service()
export class GUIDService implements OnCharacterAdd, OnCharacterRemove, OnNPCMade, OnNPCDestroyed {
	private readonly guidCache: Map<unknown, string> = new Map();

	public onNPCMade(npc: NPCType): void {
		if (this.exist(npc.model)) return;
		this.onCharacterAdd(npc.model);
	}

	public onNPCDestroyed(npc: NPCType): void {
		this.onCharacterRemove(npc.model);
	}

	public onCharacterAdd(character: CharacterModel): void {
		this.set(character);
	}

	public onCharacterRemove(character: CharacterModel): void {
		this.delete(character);
	}

	public get(obj: unknown): string {
		return this.exist(obj) ?? this.set(obj);
	}

	public set<T>(obj: T): string {
		const unique = this.writeUnique();
		this.guidCache.set(obj, unique);
		return unique;
	}

	public delete<T>(obj: T): void {
		return void (this.exist(obj) && this.guidCache.delete(obj));
	}

	private writeUnique(): string {
		return http.GenerateGUID(false).lower();
	}

	private exist(obj: unknown): Maybe<string> {
		return this.guidCache.get(obj);
	}
}
