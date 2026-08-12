import { Controller, OnStart } from "@flamework/core";
import CharmSync, { SyncPayload } from "@rbxts/charm-sync";
import { LinkRemote } from "client/decorators";
import { Events } from "client/network";
import { BaseStateBlackboard } from "shared/structs/websocket";
import { FlameworkCharms } from "shared/constants";
import { SpawnTask } from "shared/decorators";
import { LogStart } from "shared/hooks";
import { WebsocketUtilities } from "shared/classes/websocket-utilities";
@Controller()
export class WebsocketController extends WebsocketUtilities implements OnStart, LogStart {
	private readonly atoms = FlameworkCharms;
	private readonly syncer = CharmSync.client({
		atoms: this.atoms,
		ignoreUnhydrated: true,
	});
	@SpawnTask()
	public async onStart(): Promise<void> {
		await this.establishServerConnection();
	}

	public async establishServerConnection() {
		return Events.state.hydrate();
	}
	@LinkRemote(Events.state.updated)
	public onStateUpdated(payload: SyncPayload<BaseStateBlackboard>) {
		this.syncer.sync(payload);
	}
}
