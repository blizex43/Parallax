import { Networking } from "@flamework/networking";
import { createBinarySerializer } from "@rbxts/flamework-binary-serializer";

import type { PlayerData } from "./data-models/player-data";
import {
	type EffectPacket,
	type AssetPacket,
	type AudioPacket,
	type AttackPacket,
	type PushPacket,
	type AnimationReplicatorPacket,
	type BlockPacket,
	SprintPacket,
	DashPacket,
} from "./structs/packets";
import type { ReplicationOptions } from "./classes/replicable";
import type { SyncPayload } from "@rbxts/charm-sync";
import type { BaseStateBlackboard } from "./structs/websocket";
import type { ScreenshakePropertiesType } from "./structs/screen-shake";
import type { FieldOfViewProperties } from "./structs/field-of-view";
import type { AttackLiterals } from "./structs/attack";

type SerializedRemote = (packet: SerializedPacket) => void;
type UnreliableSerializedRemote = Networking.Unreliable<(packet: SerializedPacket) => void>;

interface ServerEvents {
	useReplicationOptions(options: ReplicationOptions): void;
	readonly audio: {
		replicate: SerializedRemote;
	};
	readonly animation: {
		replicate: SerializedRemote;
	};

	readonly game: {
		attack: SerializedRemote;
		readonly hitbox: {
			report(sessionId: string, target: Model): void;
			cancel(sessionId: string): void;
		};
		block: SerializedRemote;
		sprint: SerializedRemote;
		dash: SerializedRemote;
	};
	readonly effect: {
		replicate: SerializedRemote;
	};
	readonly asset: {
		initialize(): void;
	};
	readonly data: {
		initialize(): void;
	};
	readonly push: {
		run: SerializedRemote;
	};
	readonly character: {
		toggleDefaultMovement(on: boolean): void;
	};
	readonly state: {
		hydrate(): void;
	};
	readonly debug: {
		subscribe(): void;
	};
}

interface ClientEvents {
	readonly game: {
		sprint: SerializedRemote;
		readonly hitbox: {
			begin(
				sessionId: string,
				startsAt: number,
				endsAt: number,
				offset: CFrame,
				size: Vector3,
				animationName: string,
				attackName: AttackLiterals,
				cooldownEndsAt: number,
				animationSpeed: number,
			): void;
			finish(sessionId: string): void;
		};
	};
	readonly camera: {
		screenshake: SerializedRemote;
		fieldofview: SerializedRemote;
	};
	readonly audio: {
		played: SerializedRemote;
	};
	readonly network: {
		owner: SerializedRemote;
	};
	readonly animation: {
		played: SerializedRemote;
	};
	readonly effect: {
		replicate: SerializedRemote;
	};
	readonly asset: {
		replicate: SerializedRemote;
	};
	readonly push: {
		run: SerializedRemote;
	};
	readonly data: {
		loaded: SerializedRemote;
		updated: SerializedRemote;
	};
	readonly state: {
		updated(payload: SyncPayload<BaseStateBlackboard>): void;
	};
}

interface ServerFunctions {}

interface ClientFunctions {}

export const Serializers = <const>{
	playerData: createBinarySerializer<PlayerData>(),
	audio: createBinarySerializer<AudioPacket>(),
	asset: createBinarySerializer<AssetPacket>(),
	effect: createBinarySerializer<EffectPacket>(),
	attack: createBinarySerializer<AttackPacket>(),
	push: createBinarySerializer<PushPacket>(),
	animation: createBinarySerializer<AnimationReplicatorPacket>(),
	screenshake: createBinarySerializer<ScreenshakePropertiesType>(),
	fieldofview: createBinarySerializer<FieldOfViewProperties>(),
	block: createBinarySerializer<BlockPacket>(),
	sprint: createBinarySerializer<SprintPacket>(),
	dash: createBinarySerializer<DashPacket>(),
};

export const GlobalEvents = Networking.createEvent<ServerEvents, ClientEvents>();
export const GlobalFunctions = Networking.createFunction<ServerFunctions, ClientFunctions>();
