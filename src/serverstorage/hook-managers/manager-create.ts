import { Modding, type OnStart, Service } from "@flamework/core";
import type { OnCharmManagerCreated, OnCharmManagerDestroyed } from "serverstorage/hooks";
import type { WebsocketService } from "serverstorage/services/websocket";
import type { WebsocketUtilities } from "shared/classes/websocket-utilities";

@Service()
export class ManagerCreateService implements OnStart {
	private readonly addListeners = new Set<OnCharmManagerCreated>();
	private readonly removeListeners = new Set<OnCharmManagerDestroyed>();
	public constructor(private readonly ws: WebsocketService) { }
	public onStart(): void {
		Modding.onListenerAdded<OnCharmManagerCreated>((object) => this.addListeners.add(object));
		Modding.onListenerRemoved<OnCharmManagerCreated>((object) => this.addListeners.delete(object));
		Modding.onListenerAdded<OnCharmManagerDestroyed>((object) => this.removeListeners.add(object));
		Modding.onListenerRemoved<OnCharmManagerDestroyed>((object) => this.removeListeners.delete(object));
		this.ws.wsCreated.Connect((plaracter, manager) => this.charmAdded(plaracter, manager));
		this.ws.wsDestroying.Connect((plaracter, manager) => this.charmDestroying(plaracter, manager));
	}

	public charmAdded(plaracter: Plaracter, manager: WebsocketUtilities): void {
		for (const listener of this.addListeners) listener.onCharmManagerCreated(plaracter, manager);
	}

	public charmDestroying(plaracter: Plaracter, manager: WebsocketUtilities): void {
		for (const listener of this.removeListeners) listener.onCharmManagerDestroyed(plaracter, manager);
	}
}
