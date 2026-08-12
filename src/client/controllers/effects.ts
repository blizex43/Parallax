import { Controller, type OnStart } from "@flamework/core";
import { Register, Start } from "@rbxts/refx";
import { ReplicatedStorage } from "@rbxts/services";
import { init } from "@zilibobi/forge-vfx";
import { LinkSerializedRemote } from "client/decorators";
import { Events } from "client/network";
import { VFXExtendable } from "shared/classes/effect-replicate";
import { SpawnTask } from "shared/decorators";
import { Serializers } from "shared/network";
import type { EffectPacket } from "shared/structs/packets";
@Controller()
export class VFXController extends VFXExtendable implements OnStart {
	onStart(): void {
		Register(ReplicatedStorage.Assets.VFX);
		this.getAndPublishEffectFiles();
		Start();
		init();
	}
	@SpawnTask()
	@LinkSerializedRemote(Events.effect.replicate, Serializers.effect)
	public onEffectFired(effectPacket: EffectPacket): void {
		const options = effectPacket.options;
		this.invokeSelf(effectPacket.name, options);
	}
}
