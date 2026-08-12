import type { ServerSender as ServerEventSender } from "@flamework/networking/out/events/types";
import type { Serializer } from "@rbxts/flamework-binary-serializer";
import type { PlayerService } from "serverstorage/services/player";
import type { SerializedOf } from "shared/classes/replicable";
import { isPlayer } from "shared/utility/t-isA";

export abstract class CameraExtendable<
	Packet extends object,
	Preset extends Record<string | number, Packet> = Record<string | number, Packet>,
	PresetEnum extends keyof Preset = keyof Preset,
> {
	protected abstract readonly netEvent: ServerEventSender<[packet: SerializedOf<Packet>]>;
	protected abstract readonly serializer: Serializer<Packet>;
	protected abstract readonly presetValues: Preset;
	public constructor(protected readonly players: PlayerService) {}

	public invoke(plaracter: Plaracter, preset: PresetEnum): void {
		const player = isPlayer(plaracter) ? plaracter : this.players.get(plaracter);
		if (!player) return;
		return this.sendToPlayer(player, this.getPresetProperties(preset));
	}

	private sendToPlayer(player: Player, properties: Packet): void {
		return this.netEvent(player, this.serializer.serialize(properties));
	}

	private getPresetProperties(preset: PresetEnum): Packet {
		return this.presetValues[preset];
	}
}
