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
import { FieldOfViewProperties } from "./structs/field-of-view";

type SerializedRemote = (packet: SerializedPacket) => void;
type UnreliableSerializedRemote = Networking.Unreliable<(packet: SerializedPacket) => void>;

interface ServerEvents {
	useReplicationOptions(options: ReplicationOptions): void;
	audio: {
		replicate: SerializedRemote;
	};
	animation: {
		replicate: SerializedRemote;
	};

	game: {
		attack: SerializedRemote;
		block: SerializedRemote;
		sprint: SerializedRemote;
		dash: SerializedRemote;
	};
	effect: {
		replicate: SerializedRemote;
	};
	asset: {
		initialize(): void;
	};
	data: {
		initialize(): void;
	};
	push: {
		run: SerializedRemote;
	};
	character: {
		toggleDefaultMovement(on: boolean): void;
	};
	state: {
		hydrate(): void;
	};
	debug: {
		subscribe(): void;
	};
}

interface ClientEvents {
	game: {
		sprint: SerializedRemote;
	};
	camera: {
		screenshake: SerializedRemote;
		fieldofview: SerializedRemote;
	};
	audio: {
		played: SerializedRemote;
	};
	network: {
		owner: SerializedRemote;
	};
	animation: {
		played: SerializedRemote;
	};
	effect: {
		replicate: SerializedRemote;
	};
	asset: {
		replicate: SerializedRemote;
	};
	push: {
		run: SerializedRemote;
	};
	data: {
		loaded: SerializedRemote;
		updated: SerializedRemote;
	};
	state: {
		updated(payload: SyncPayload<BaseStateBlackboard>): void;
	};
}

interface ServerFunctions { }

interface ClientFunctions { }

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
