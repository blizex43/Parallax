import { Modding, type OnStart, Service } from "@flamework/core";
import type { OnNPCDestroyed, OnNPCMade } from "serverstorage/hooks";
import { NPCAdded, NPCRemoving } from "shared/constants";
import { OnSignalSubscribed } from "shared/decorators";
import type { NPCType } from "shared/structs/npc";
@Service({ loadOrder: 0 })
export class NPCListenService implements OnStart {
	private readonly addListeners = new Set<OnNPCMade>();
	private readonly removeListeners = new Set<OnNPCDestroyed>();
	public onStart(): void {
		Modding.onListenerAdded<OnNPCMade>((object) => this.addListeners.add(object));
		Modding.onListenerRemoved<OnNPCMade>((object) => this.addListeners.delete(object));
		Modding.onListenerAdded<OnNPCDestroyed>((object) => this.removeListeners.add(object));
		Modding.onListenerRemoved<OnNPCDestroyed>((object) => this.removeListeners.delete(object));
	}

	@OnSignalSubscribed(NPCAdded)
	public npcAdded(npc: NPCType): void {
		for (const listener of this.addListeners) listener.onNPCMade(npc);
	}
	@OnSignalSubscribed(NPCRemoving)
	public npcRemoving(npc: NPCType): void {
		for (const listener of this.removeListeners) listener.onNPCDestroyed(npc);
	}
}
