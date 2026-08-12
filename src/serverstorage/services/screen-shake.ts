import { Service } from "@flamework/core";
import { ScreenShakePresetValues } from "shared/enums/screen-shake-enum";
import type { ScreenshakePropertiesType } from "shared/structs/screen-shake";
import type { PlayerService } from "./player";
import { Events } from "serverstorage/network";
import { Serializers } from "shared/network";
import { CameraExtendable } from "serverstorage/classes/camera-extendable";
import type { ServerSender } from "@flamework/networking/out/events/types";

@Service()
export class ScreenShakeService extends CameraExtendable<ScreenshakePropertiesType> {
	protected netEvent: ServerSender<[packet: { buffer: buffer; blobs: defined[] }]> = Events.camera.screenshake;
	protected serializer = Serializers.screenshake;
	protected presetValues = ScreenShakePresetValues;
	public constructor(protected readonly players: PlayerService) {
		super(players);
	}
}
