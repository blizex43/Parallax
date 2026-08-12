import { callMethodOnDependencies } from "@rbxts/flamework-meta-utils";
import type { Serializer } from "@rbxts/flamework-binary-serializer";
import type { ServerReceiver as ServerEventReceiver } from "@flamework/networking/out/events/types";
import type { ServerReceiver as ServerFunctionReceiver } from "@flamework/networking/out/functions/types";
import { FlameworkIgnited } from "shared/constants";
import { Dependency, Modding } from "@flamework/core";
import { MetaParams, MetaType } from "shared/structs/meta";
import { Meta } from "shared/meta";
import { t } from "@rbxts/t";
import LazyIterator from "@rbxts/lazy-iterator";
import { millisecondsToSeconds } from "shared/utility/numbers";
import type { DebugService } from "./services/debug";
import { now } from "shared/utility/time";

type ServerReceiver<I extends unknown[] = unknown[], O = void> = ServerEventReceiver<I> | ServerFunctionReceiver<I, O>;

/** @metadata reflect identifier flamework:parameters */
export function LinkRemote<I extends unknown[] = unknown[], O = void>(remote: ServerReceiver<I, O>) {
	return (
		ctor: object,
		propertyKey: string,
		descriptor: TypedPropertyDescriptor<(this: unknown, player: Player, ...input: I) => O>,
	) => {
		FlameworkIgnited.Once(() => {
			(<UnionToIntersection<ServerReceiver<I, O>>>remote)["setCallback" in remote ? "setCallback" : "connect"](
				(...args) => <Promise<O> | O>callMethodOnDependencies(ctor, descriptor, ...args),
			);
		});
	};
}

/** @metadata reflect identifier flamework:parameters */
export function LinkSerializedRemote<
	PacketStruct extends object,
	I extends [packet: SerializedPacket] = [packet: SerializedPacket],
	O = void,
>(remote: ServerReceiver<I, O>, deserializer: Serializer<PacketStruct>) {
	return (
		ctor: object,
		propertyKey: string,
		descriptor: TypedPropertyDescriptor<
			(this: unknown, player: Player, struct: PacketStruct, ...otherArgs: never[]) => O
		>,
	) => {
		FlameworkIgnited.Once(() => {
			(<UnionToIntersection<ServerReceiver<I, O>>>remote)["setCallback" in remote ? "setCallback" : "connect"](
				(...args) => {
					const [player, { buffer, blobs }] = args;
					args.shift();

					const struct = deserializer.deserialize(buffer, blobs);
					return <Promise<O> | O>(
						callMethodOnDependencies(ctor, descriptor, player, struct, ...(<never[]>(<unknown>args)))
					);
				},
			);
		});
	};
}

/** Determines if the function will run according to what restriction is set */
export const AddMetaRestrictions = Modding.createDecorator<[enforce: Partial<MetaParams>]>(
	"Method",
	(descriptor, [enforce]) => {
		// FlameworkIgnited.Once(() => {
		const object = <Record<string, Callback>>(<unknown>descriptor.constructor!);
		const originalMethod = object[descriptor.property];
		enforce.hasMeta ??= false;
		const amount = LazyIterator.fromValues(enforce).collect().size();
		object[descriptor.property] = function (this, ...args: unknown[]) {
			const metaTable = <MetaType>args[1];
			const difference = millisecondsToSeconds(now() - metaTable.__meta._time);
			let checklist = 0;
			if (!t.table(metaTable) || !Meta.hasMeta(metaTable)) return;
			if (enforce.hasMeta) checklist++;
			if (enforce.timeout && difference <= enforce.timeout) checklist++;
			if (checklist === amount) return originalMethod(this, ...args);
		};
	},
);

/** The function placed will only run if in debug mode. */
export function DebugOnly<I extends unknown[] = unknown[], V extends void = void>(
	ctor: object,
	propertyKey: string,
	descriptor: TypedPropertyDescriptor<(this: unknown, ...input: I) => V>,
) {
	FlameworkIgnited.Once(() => {
		const object = <Record<string, Callback>>ctor;
		const debug = Dependency<DebugService>();
		debug.debugCallbacks.push(descriptor.value);
		object[propertyKey] = function (this, ...args: I): void {
			if (debug.enabled()) return descriptor.value(this, ...args);
		};
	});
}
