import { Service } from "@flamework/core";

import { Events } from "serverstorage/network";
import { SerializedReplicator } from "shared/classes/replicable";
import { LogStart } from "shared/hooks";

@Service()
export class AudioService extends SerializedReplicator implements LogStart {
	public constructor() {
		super(Events.audio.replicate, Events.audio.played);
	}
}
