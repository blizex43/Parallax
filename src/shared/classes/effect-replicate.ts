import { getChildrenOfType } from "@rbxts/instance-utility";
import Object from "@rbxts/object-utils";
import { RunService as run } from "@rbxts/services";
import type { EffectModule, EffectName, PacketSafeEffectOptions, StandardEffect } from "shared/structs/effect";
import type { EffectPacket } from "shared/structs/packets";
import { getClosestPlayers } from "shared/utility/instance";
import { getInstanceAtPath } from "shared/utility/meta";
export abstract class VFXExtendable {
	protected readonly requiredModules: Record<string, EffectModule> = {};
	protected readonly savedEffects: Map<CharacterModel, Record<EffectName, StandardEffect>> = new Map();
	public async invokeSelf(name: EffectName, options: PacketSafeEffectOptions): Promise<void> {
		const { character } = options;

		const formatted = name.lower();

		if (!(formatted in this.requiredModules)) {
			return;
		}

		const effectClass = this.requiredModules[formatted];

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
			instance = new effectClass(options);
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
			} else {
				this.callPropertyOfEffect(instance, options);
			}
		}
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
