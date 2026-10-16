import { getChildrenOfType } from "@rbxts/instance-utility";
import Object from "@rbxts/object-utils";
import { RunService as run } from "@rbxts/services";
import type {
	EffectInfo,
	EffectModule,
	EffectName,
	PacketSafeEffectOptions,
	StandardEffect,
	VFXMetadata,
} from "shared/structs/effect";
import type { EffectPacket } from "shared/structs/packets";
import { getClosestPlayers } from "shared/utility/instance";
import { getInstanceAtPath } from "shared/utility/meta";
import { isThrottled, now } from "shared/utility/time";
import { EffectCatalog } from "shared/enums/effect-enum";

abstract class VFXInfo {
	protected readonly metadata: VFXMetadata = { lastEffectUsed: undefined, effectData: new Map() };
	constructor() {}
	protected write<M extends Exclude<keyof VFXMetadata, "effectData">, V extends VFXMetadata[M]>(
		metaname: M,
		value: V,
	) {
		this.metadata[metaname] = value;
	}

	protected read<M extends keyof VFXMetadata, T extends VFXMetadata[M]>(metaname: M): T {
		return <T>this.metadata[metaname];
	}

	protected readEffect<M extends keyof EffectInfo, T extends EffectInfo[M]>(
		effect: EffectName,
		metaname: M,
	): Maybe<T> {
		const effectInfo = this.metadata.effectData.get(effect);
		if (!effectInfo) return;
		return <T>effectInfo[metaname];
	}

	protected documentEffectInfo(effect: EffectName): void {
		this.metadata.effectData.set(effect, {
			lastUsed: now(),
		});
	}
}
export abstract class VFXExtendable extends VFXInfo {
	protected readonly requiredModules: Record<string, EffectModule> = {};
	protected readonly savedEffects: Map<CharacterModel, Record<EffectName, StandardEffect>> = new Map();
	public async invokeSelf(name: EffectName, options: PacketSafeEffectOptions): Promise<void> {
		const { character } = options;
		const throttlable = options.timeout;
		const lastUsed = this.readEffect(name, "lastUsed");
		if (throttlable && lastUsed && isThrottled(lastUsed, throttlable)) return;
		const definition = EffectCatalog[name];
		const effectClass =
			(definition.handler && this.requiredModules[definition.handler]) ?? this.requiredModules["catalog-effect"];
		if (!effectClass) return;

		if (options.delay && run.IsClient()) {
			task.wait(options.delay);
		}

		let hostInstance = this.savedEffects.get(character);

		if (!hostInstance) {
			hostInstance = {} as Record<EffectName, StandardEffect>;
			this.savedEffects.set(character, hostInstance);
		}

		const isClient = run.IsClient();
		const isServer = run.IsServer();

		let instance: Maybe<StandardEffect>;

		if (!options.deactivate || isClient) {
			instance = new effectClass(options, name);
			hostInstance[name] = instance;
		} else if (options.deactivate) {
			instance = hostInstance[name];
		}

		if (!instance) {
			return;
		}

		if (isServer) {
			if (!options.deactivate) {
				instance.Start(options.players);
				this.playKeyframes(name, options);
			} else {
				this.callPropertyOfEffect(instance, options);
			}
		}
		this.write("lastEffectUsed", name);
		this.documentEffectInfo(name);
	}

	private playKeyframes(name: EffectName, options: PacketSafeEffectOptions): void {
		for (const keyframe of EffectCatalog[name].keyframes ?? [])
			task.delay(keyframe.at, () => {
				const frameOptions = keyframe.options;
				this.invokeSelf(keyframe.effect, {
					...options,
					...frameOptions,
					character: frameOptions?.character ?? options.character,
					players: frameOptions?.players ?? options.players,
				});
			});
	}
	protected callPropertyOfEffect(
		instance: StandardEffect,
		options: PacketSafeEffectOptions,
		property: "onRemote" = "onRemote",
	) {
		if (property in instance) pcall(() => instance[property]?.(options));
	}

	protected getAndPublishEffectFiles() {
		for (const module of getChildrenOfType(getInstanceAtPath("src/shared/classes/effect-library")!, "ModuleScript"))
			this.requiredModules[module.Name.lower()] = Object.values(
				require<Record<string, EffectModule>>(module),
			).shift()!;
	}

	protected filterFromRadius(effectPacket: EffectPacket): Player[] {
		const { options } = effectPacket;
		if (!options.character) return [];
		const closest = getClosestPlayers(options.character, options.radius!, undefined, true);
		return options.players.filter((player) => closest.includes(player));
	}
}
