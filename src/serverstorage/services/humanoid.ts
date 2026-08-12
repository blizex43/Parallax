import { type OnInit, Service } from "@flamework/core";
import { Humanoid } from "serverstorage/components/humanoid";
import type { OnCharacterAdd, OnCharacterRemove } from "shared/hooks";
import type { DataService } from "./third-party/data";

@Service()
export class HumanoidService implements OnCharacterAdd, OnCharacterRemove, OnInit {
	private readonly components: Map<CharacterModel, Humanoid> = new Map();
	constructor(private readonly database: DataService) {}
	public onInit(): void {
		this.database.updated.Connect((player) => {
			const character = <Maybe<CharacterModel>>player.Character;
			if (!character) return;
			this.update(character);
		});
	}
	public onCharacterAdd(character: CharacterModel): void {
		this.set(character);
	}
	public onCharacterRemove(character: CharacterModel): void {
		this.delete(character);
	}

	public get(character: CharacterModel): Maybe<Humanoid> {
		return this.components.get(character);
	}

	public set(character: CharacterModel): Humanoid {
		const hum = Humanoid.create(character);
		this.components.set(character, hum);
		return hum;
	}

	public delete(character: CharacterModel): void {
		const existing = this.components.get(character);
		this.components.delete(character);
		return existing && existing.onDestroy();
	}

	private update(character: CharacterModel): void {
		const humanoidComponent = this.components.get(character);
		if (!humanoidComponent) return;
		return humanoidComponent.update();
	}
}
