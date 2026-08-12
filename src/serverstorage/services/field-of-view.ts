import { Service } from "@flamework/core";
import type { PlayerService } from "./player";
import { FieldOfViewPresets, FieldOfViewPresetValues } from "shared/enums/field-of-view-enum";
import { CameraExtendable } from "serverstorage/classes/camera-extendable";
import type { ServerSender } from "@flamework/networking/out/events/types";
import { Events } from "serverstorage/network";
import { Serializers } from "shared/network";
import type { FieldOfViewProperties } from "shared/structs/field-of-view";

@Service()
export class FieldOfViewService extends CameraExtendable<FieldOfViewProperties> {
	protected netEvent: ServerSender<[packet: { buffer: buffer; blobs: defined[]; }]> = Events.camera.fieldofview;
	protected serializer = Serializers.fieldofview;
	protected presetEnums: number = FieldOfViewPresets.Clash;
	protected presetValues = FieldOfViewPresetValues;
	public constructor(protected readonly players: PlayerService) {
		super(players);
	}
}
