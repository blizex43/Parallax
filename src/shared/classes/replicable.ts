import type {
	ClientReceiver as ClientEventReceiver,
	ClientSender as ClientEventSender,
	ServerSender as ServerEventSender,
	ServerReceiver as ServerEventReceiver,
} from "@flamework/networking/out/events/types";
import type { Serializer } from "@rbxts/flamework-binary-serializer";
import { Players, ServerStorage } from "@rbxts/services";
import LazyIterator from "@rbxts/lazy-iterator";
import Destroyable from "@rbxts/destroyable";

interface WithRange {
	readonly rangeOrigin: Vector3;
	readonly range: number;
}

interface WithoutRange {
	readonly rangeOrigin?: undefined;
	readonly range?: undefined;
}

interface BaseReplicationOptions {}

export type ReplicationOptions = BaseReplicationOptions & (WithRange | WithoutRange);

const DEFAULT_REPLICATION_OPTIONS: ReplicationOptions = {};

export type SerializedOf<Packet extends object> = ReturnType<Serializer<Packet>["serialize"]>;

/** The replicable to create on the client */
export abstract class Replicable<I extends unknown[], O extends unknown[] = I> extends Destroyable {
	protected readonly useReplicationOptions: ClientEventSender<[options: ReplicationOptions]>;

	public constructor(
		receiver: ClientEventReceiver<I>,
		protected readonly sender: ClientEventSender<I>,
	) {
		super();

		const { Events } = require<typeof import("client/network")>(
			Players.LocalPlayer.WaitForChild("PlayerScripts")
				.WaitForChild("PlayerModules")
				.WaitForChild<ModuleScript>("network"),
		);

		this.useReplicationOptions = Events.useReplicationOptions;

		this.trash.add(receiver.connect((...args) => this.onReceive(...args)));
	}

	protected onReceive(...args: I): void {
		this.replicate(...(<O>(<unknown>args)));
	}

	protected abstract replicate(...args: O): void;

	protected requestReplication(replicationOptions = DEFAULT_REPLICATION_OPTIONS, ...args: I): void {
		this.useReplicationOptions(replicationOptions);
		this.sender(...args);
		this.onReceive(...args);
	}
}

/** Replicates to client */
export class Replicator<I extends unknown[]> extends Destroyable {
	public static replicationOptions = DEFAULT_REPLICATION_OPTIONS;

	public static initialize(): void {
		const { Events } = require<typeof import("serverstorage/network")>(
			ServerStorage.WaitForChild("Modules").WaitForChild<ModuleScript>("network"),
		);

		Events.useReplicationOptions.connect(
			(_, options) => (Replicator.replicationOptions = <BaseReplicationOptions & WithoutRange>options),
		);
	}

	public constructor(receiver: ServerEventReceiver<I>, sender: ServerEventSender<I>) {
		super();

		this.trash.add(
			receiver.connect((player, ...args) => {
				const players = replicablePlayers(player);
				sender(players.collect(), ...args);
			}),
		);
	}
}

/** The replicable to create on the client */
export abstract class SerializedReplicable<Packet extends object = object> extends Replicable<
	[packet: SerializedOf<Packet>],
	[packet: Packet]
> {
	public constructor(
		receiver: ClientEventReceiver<[packet: SerializedOf<Packet>]>,
		sender: ClientEventSender<[packet: SerializedOf<Packet>]>,
		private readonly serializer: Serializer<Packet>,
	) {
		super(receiver, sender);
	}

	protected override onReceive(packet: SerializedOf<Packet>): void {
		const { buffer, blobs } = packet;
		const deserialized = this.serializer.deserialize(buffer, blobs);

		this.replicate(deserialized);
	}

	protected abstract replicate(packet: Packet): void;

	protected requestReplication(packet: Packet, replicationOptions = DEFAULT_REPLICATION_OPTIONS): void {
		const serialized = this.serializer.serialize(packet);
		this.useReplicationOptions(replicationOptions);
		this.sender(serialized);

		this.onReceive(serialized);
	}
}

/** Macro for Iterating and resolving replicable clients */
export function replicablePlayers(originPlayer: Player): LazyIterator<Player> {
	let players = LazyIterator.fromArray(Players.GetPlayers()).filter((p) => p !== originPlayer);

	if (Replicator.replicationOptions.range !== undefined) {
		players = players.filter((player) => {
			const character = <Maybe<CharacterModel>>player.Character;
			if (character === undefined || !character.HumanoidRootPart) return false;

			const distance = character.HumanoidRootPart.Position.sub(
				Replicator.replicationOptions.rangeOrigin!,
			).Magnitude;

			return distance < Replicator.replicationOptions.range!;
		});
	}

	return players;
}

/** Replicates to client */
export class SerializedReplicator extends Replicator<[packet: SerializedPacket]> {}
