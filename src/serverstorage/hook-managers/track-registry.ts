import { Modding, OnStart, Service } from "@flamework/core";
import type { AnimationService } from "serverstorage/services/animation";
import type { OnCharacterAnimationsDeregistered, OnCharacterAnimationsRegistered } from "shared/hooks";
import type { AnimationTrackComponentRecord } from "shared/structs/animation";

@Service()
export class TrackRegistryService implements OnStart {
	private readonly addListeners = new Set<OnCharacterAnimationsRegistered>();
	private readonly removeListeners = new Set<OnCharacterAnimationsDeregistered>();
	constructor(private readonly animation: AnimationService) {}
	public onStart(): void {
		Modding.onListenerAdded<OnCharacterAnimationsRegistered>((object) => this.addListeners.add(object));
		Modding.onListenerRemoved<OnCharacterAnimationsRegistered>((object) => this.addListeners.delete(object));
		Modding.onListenerAdded<OnCharacterAnimationsDeregistered>((object) => this.removeListeners.add(object));
		Modding.onListenerRemoved<OnCharacterAnimationsDeregistered>((object) => this.removeListeners.delete(object));
		this.animation.onRegistered.Connect((character, tracks) => this.characterRegistered(character, tracks));
		this.animation.onDeregistered.Connect((character) => this.characterDeregistered(character));
	}

	private characterRegistered(character: CharacterModel, tracks: AnimationTrackComponentRecord): void {
		print(character, tracks);
		for (const listener of this.addListeners) listener.onCharacterAnimationsRegistered(character, tracks);
	}

	private characterDeregistered(character: CharacterModel): void {
		for (const listener of this.removeListeners) listener.onCharacterAnimationsDeregistered(character);
	}
}
