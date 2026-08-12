import { Controller, type OnStart } from "@flamework/core";
import type { LogStart } from "shared/hooks";
import type { OnDataUpdate } from "client/hooks";
import { Events } from "client/network";
import { type PlayerData, INITIAL_DATA } from "shared/data-models/player-data";
import { ReplicatedStorage } from "@rbxts/services";
import Signal from "@rbxts/signal";
import { promisifyEvent } from "shared/utility/promises";
@Controller({ loadOrder: 1000 })
export class ReplicaController implements OnStart, OnDataUpdate, LogStart {
	public readonly updated: Signal<(data: PlayerData) => void> = new Signal();
	public readonly initialized: boolean = false;
	private readonly onDataUpdatedBindable: BindableEvent =
		ReplicatedStorage.WaitForChild("LuaBindables").WaitForChild("onDataUpdated");
	public readonly data: PlayerData = INITIAL_DATA;

	public onStart(): void {
		Events.data.initialize();
	}

	public onDataUpdate(this: Writable<ReplicaController>, data: PlayerData): void {
		this.data = data;
		if (!this.initialized) this.initialized = true;
		this.notify(data);
	}

	public async waitForDataSignal(): Promise<PlayerData> {
		return (await promisifyEvent(this.updated))[0];
	}

	public notify(data: PlayerData): void {
		this.updated.Fire(data);
		return this.onDataUpdatedBindable.Fire(data);
	}

	public getData(): PlayerData {
		return this.data;
	}
}
