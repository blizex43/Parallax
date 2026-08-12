import { Controller } from "@flamework/core";
import { Events } from "client/network";
import { SerializedReplicable } from "shared/classes/replicable";
import { Serializers } from "shared/network";
import type { AnimationReplicatorPacket } from "shared/structs/packets";
import type { AnimationController } from "./animation";

@Controller()
export class AnimationReplicableController extends SerializedReplicable<AnimationReplicatorPacket> {
	constructor(private readonly animation: AnimationController) {
		super(Events.animation.played, Events.animation.replicate, Serializers.animation);
	}
	protected async replicate(packet: AnimationReplicatorPacket): Promise<void> {
		const { name, options } = packet;
		if (!this.animation.isRegistered(options.character)) {
			await this.animation.onCharacterAdd(options.character);
		}
		if (options.play)
			this.animation.playAnim(options.character, name, options.stopOthers ?? false, options.offsets);
		else this.animation.stopAnim(options.character, name);
	}
}
