import { Modding, Service, type OnStart } from "@flamework/core";
import { OnCharacterDataLoad } from "serverstorage/hooks";
import { CharacterService } from "serverstorage/services/character";

@Service({ loadOrder: 0 })
export class CharacterDataAddService implements OnStart {
	private readonly addListeners = new Set<OnCharacterDataLoad>();
	public constructor(private readonly charData: CharacterService) {}
	public onStart(): void {
		Modding.onListenerAdded<OnCharacterDataLoad>((object) => this.addListeners.add(object));
		this.charData.onCharacterDataLoad.Connect((character) => this.characterDataLoaded(character));
	}

	public async characterDataLoaded(character: CharacterModel): Promise<void> {
		for (const listener of this.addListeners) listener.onCharacterDataLoad(character);
	}
}
