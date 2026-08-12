import { Service, type OnInit } from "@flamework/core";
import type { EffectPacket } from "shared/structs/packets";
import type { DebugService } from "./debug";
import { stringHas } from "shared/utility/strings";
import { LinkSerializedRemote } from "serverstorage/decorators";
import { Events } from "serverstorage/network";
import { Serializers } from "shared/network";
import type { WebsocketManagementService } from "./websocket-manager";
import { MiscState } from "shared/enums/config-enum";
import { EffectTimeout } from "shared/enums/effect-enum";
import { VFXExtendable } from "shared/classes/effect-replicate";
@Service()
export class VFXService extends VFXExtendable implements OnInit {
	constructor(
		private readonly debug: DebugService,
		private readonly ws: WebsocketManagementService,
	) {
		super();
	}
	public onInit(): void {
		this.getAndPublishEffectFiles();
	}

	@LinkSerializedRemote(Events.effect.replicate, Serializers.effect)
	public remoteEffect(player: Player, effectPacket: EffectPacket) {
		if (!this.eligibleForReplication(player)) return;
		this.effectReplicate(effectPacket);
		this.ws.setStateFor(player, MiscState.Effect, true, EffectTimeout, false, true);
	}

	public effectReplicate(effectPacket: EffectPacket) {
		const { options, name } = effectPacket;
		const debug = options.debug;
		let players = debug ? this.filterDebug(effectPacket) : options.players;
		if (options.radius) players = this.filterFromRadius(effectPacket);
		if (!players.isEmpty()) this.invokeSelf(name, options);
	}

	protected filterDebug(effectPacket: EffectPacket): Player[] {
		if (!stringHas(effectPacket.name, "debug")) return effectPacket.options.players;
		const participants = this.debug.getParticipants();
		return (effectPacket.options.players = effectPacket.options.players.filter((player) =>
			participants.includes(player),
		));
	}

	private eligibleForReplication(player: Player): boolean {
		const effected = this.ws.getStateValue<boolean>(player, MiscState.Effect);
		return !effected;
	}
}
