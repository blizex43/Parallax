import { Modding, Controller, type OnStart } from "@flamework/core";

import { OnCharacterLoaded, type OnCharacterAdd, type OnCharacterRemove } from "shared/hooks";
import { Player } from "client/utility";
import { isNull } from "shared/utility/t-isA";

@Controller({ loadOrder: 0 })
export class CharacterAddController implements OnStart {
	public onStart(): void {
		const addListeners = new Set<OnCharacterAdd>();
		const loadListeners = new Set<OnCharacterLoaded>();
		const removeListeners = new Set<OnCharacterRemove>();
		Modding.onListenerAdded<OnCharacterAdd>((object) => addListeners.add(object));
		Modding.onListenerRemoved<OnCharacterAdd>((object) => addListeners.delete(object));
		Modding.onListenerAdded<OnCharacterLoaded>((object) => loadListeners.add(object));
		Modding.onListenerRemoved<OnCharacterLoaded>((object) => loadListeners.delete(object));
		Modding.onListenerAdded<OnCharacterRemove>((object) => removeListeners.add(object));
		Modding.onListenerRemoved<OnCharacterRemove>((object) => removeListeners.delete(object));

		async function characterAdded(character: Model): Promise<void> {
			for (const listener of addListeners) task.defer(() => listener.onCharacterAdd(<CharacterModel>character));
		}

		async function characterLoaded(character: Model): Promise<void> {
			for (const listener of loadListeners) task.defer(() => listener.onCharacterAdd(<CharacterModel>character));
		}

		async function characterRemoved(character: Model): Promise<void> {
			for (const listener of removeListeners)
				task.defer(() => listener.onCharacterRemove(<CharacterModel>character));
		}

		if (!isNull(Player.Character)) {
			characterAdded(Player.Character);
			if (Player.HasAppearanceLoaded()) characterLoaded(Player.Character);
		}
		Player.CharacterAppearanceLoaded.Connect(characterLoaded);
		Player.CharacterAdded.Connect(characterAdded);
		Player.CharacterRemoving.Connect(characterRemoved);
	}
}
