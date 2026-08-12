import type { AttackPacket } from "shared/structs/packets";
import type { ScalingService } from "./scaling";
import type { ScalingParams } from "shared/structs/scale";
import type {
	AttackContext,
	AttackLiterals,
	CharacterAttackingHeaderData,
	PostableWindowData,
	RegisteredAttacksType,
} from "shared/structs/attack";
import type { OnMoveClassInvoked } from "serverstorage/hooks";
import type { DataService } from "./third-party/data";
import type { PsuedoPlayerData } from "shared/data-models/player-data";
import { Service } from "@flamework/core";
import { AddMetaRestrictions, LinkSerializedRemote } from "serverstorage/decorators";
import { Events } from "serverstorage/network";
import { OnSignalSubscribed, SpawnTask } from "shared/decorators";
import { Serializers } from "shared/network";
import { RegisteredAttacks } from "serverstorage/enums/attack-enum";
import { isNull } from "shared/utility/t-isA";
import type { GUIDService } from "./guid";
import { Meta } from "shared/meta";
import { PostWindowData } from "shared/constants";
import { CombatState } from "shared/enums/config-enum";
import type { WebsocketManagementService } from "./websocket-manager";
@Service({ loadOrder: 5000 })
export class AttackHeaderService {
	private readonly runningAttacks: Map<CharacterModel, Record<AttackLiterals, Promise<void>>> = new Map();
	private readonly postData: Map<CharacterModel, PostableWindowData> = new Map();
	constructor(
		private readonly scaler: ScalingService,
		private readonly database: DataService,
		private readonly guid: GUIDService,
		private readonly wsm: WebsocketManagementService,
	) { }

	@LinkSerializedRemote(Events.game.attack, Serializers.attack)
	public async onAttackRecieved(player: Player, packet: AttackPacket): Promise<void> {
		return this.tracePlayerRemoteMeta(player, packet);
	}

	@OnSignalSubscribed(PostWindowData)
	public onPostRecieved(character: CharacterModel, data: PostableWindowData): void {
		this.postData.set(character, data);
	}

	public getRunningMeta(character: CharacterModel): CharacterAttackingHeaderData {
		const attacking = this.wsm.getStateValue<boolean>(character, CombatState.Attacking) ?? false;
		return {
			attacking,
			postData: this.postData.get(character),
			current: this.usingAny(character),
		};
	}

	public async onServerAttackInvoked(character: CharacterModel, name: AttackLiterals): Promise<void> {
		const handler = this.get(name);
		const data = this.database.getPsuedo(this.guid.get(character));
		if (!character || !handler) return;
		return this.passAndInvokeMeta(
			character,
			handler,
			data,
			<AttackPacket>Meta.fill({ name }),
			this.scaler.getByPsuedo(data),
		);
	}

	public using(character: CharacterModel, name: AttackLiterals, cancel?: AttackContext): boolean {
		const cache = this.runningAttacks.get(character);
		if (cancel && cache) this.getAndCancelHandler(cancel, name);
		return !isNull(cache) && name in cache && cache[name].getStatus() === "Started";
	}

	public usingAny(character: CharacterModel, cancel?: AttackContext): Maybe<AttackLiterals> {
		const cache = this.runningAttacks.get(character);
		if (!cache) return;
		for (const [name, promise] of pairs(cache)) {
			if (promise.getStatus() === "Started") {
				if (cancel) {
					promise.cancel();
					this.getAndCancelHandler(cancel, name);
				}
				return name;
			}
			delete cache[name];
		}

		return;
	}

	public cancelHandler(character: CharacterModel, name?: AttackLiterals): void {
		const data = this.database.getPsuedo(this.guid.get(character));
		const ctx: AttackContext = {
			data,
			character,
			scaling: this.scaler.getByPsuedo(data),
			packet: <AttackPacket>Meta.fill({ name }),
		};
		if (name) {
			this.using(character, name, ctx);
		} else this.usingAny(character, ctx);
	}

	@SpawnTask()
	@AddMetaRestrictions({ hasMeta: true, timeout: 6 })
	private async tracePlayerRemoteMeta(player: Player, packet: AttackPacket): Promise<void> {
		const character = <Maybe<CharacterModel>>player.Character;
		const handler = this.get(packet.name);
		const data = this.database.get(player);
		if (!character || !handler) return;
		return this.passAndInvokeMeta(character, handler, data, packet, this.scaler.get(player));
	}

	private async passAndInvokeMeta(
		character: CharacterModel,
		handler: OnMoveClassInvoked,
		data: PsuedoPlayerData,
		packet: AttackPacket,
		scaling: Maybe<ScalingParams>,
	): Promise<void> {
		if (!scaling || this.usingAny(character)) return;
		const context: AttackContext = {
			character,
			packet,
			data,
			scaling,
		};

		return this.addAttackToCache(context, handler.invoked(context));
	}

	private getAndCancelHandler(context: AttackContext, name: AttackLiterals): void {
		const handler = this.get(name);
		if (!handler) return;
		return handler.cancelled(context);
	}

	private addAttackToCache<T extends Promise<void>>(context: AttackContext, promise: T): T {
		let cache = this.runningAttacks.get(context.character);
		cache ??= <Record<AttackLiterals, Promise<void>>>{};
		cache[context.packet.name] = promise;
		this.runningAttacks.set(context.character, cache);
		return promise;
	}

	private get(attackName: AttackLiterals, tryGet: boolean = true) {
		return tryGet
			? (<{ success: boolean; value: RegisteredAttacksType }>RegisteredAttacks.tryGetValue()).value[attackName]
			: RegisteredAttacks.getValue()[attackName];
	}
}
