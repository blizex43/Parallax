import { type OnInit, Service } from "@flamework/core";
import { Players, RunService as run } from "@rbxts/services";
import { atom } from "@rbxts/charm";
import type { LogStart } from "shared/hooks";
import { LinkRemote } from "serverstorage/decorators";
import { Events } from "serverstorage/network";
import { OnSignalSubscribed } from "shared/decorators";
import { MiscState } from "shared/enums/config-enum";
import LazyIterator from "@rbxts/lazy-iterator";
import type { JournalService } from "./journal";
@Service({ loadOrder: -2000 })
export class DebugService implements OnInit, LogStart {
	public readonly enabled: Charm.Atom<boolean> = atom(false);
	public readonly debugCallbacks: Callback[] = [];
	public readonly participants: Set<Player> = new Set();
	constructor(private readonly journal: JournalService) {}
	public onInit(): void {
		if (run.IsStudio()) this.enable();
	}

	public enable() {
		this.enabled(true);
	}

	public getParticipants(): Player[] {
		return LazyIterator.fromSet(this.participants).collect();
	}

	public isParticipant(player: Player): boolean {
		return this.participants.has(player);
	}

	@LinkRemote(Events.debug.subscribe)
	public setParticipant(player: Player): void {
		if (this.participants.has(player)) return this.delParticipant(player);
		this.publishToClient(player, true);
		print("Subscribed", player);
		this.participants.add(player);
		print(this.participants);
	}

	@OnSignalSubscribed(Players.PlayerRemoving)
	public delParticipant<P extends Player>(player: P): void {
		this.publishToClient(player, false);
		if (this.isParticipant(player)) {
			print("Unsubscribed", player);
			this.participants.delete(player);
		}
	}

	public publishToClient(player: Player, on: boolean): void {
		return this.journal.writeStateValue(player, MiscState.Debug, on);
	}

	public run(): void {
		for (const callback of this.debugCallbacks) callback();
	}
}
