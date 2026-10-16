import { VisualEffectDecorator } from "@rbxts/refx";
import type { EffectContext, EffectName, PacketSafeEffectOptions } from "shared/structs/effect";
import { EffectCatalog } from "shared/enums/effect-enum";
import { BasePartEffect } from "../effect";

@VisualEffectDecorator
export class CatalogEffect extends BasePartEffect {
	protected name!: EffectName;
	protected reference!: EffectContext;
	protected emitCount = 1;
	protected readonly MaxLifetime = 3.5;
	protected readonly DestroyOnEnd = false;

	public constructor(protected readonly options: PacketSafeEffectOptions, name?: EffectName) {
		super();
		this.name = name ?? "Footstep";
		this.reference = EffectCatalog[this.name];
		this.emitCount = this.reference.particleReference.emissions ?? 1;
	}

	public override OnStart(): void {
		const { character } = this.options;
		const humanoid = character.FindFirstChild("Humanoid");
		if (!humanoid) return;

		const effects = this.makeEffectMultiple(character, undefined, this.options);
		const effectList = effects.size() > 0 ? effects : [this.makeEffect(character, undefined, undefined, this.options)];
		for (const effect of effectList) {
			if (!effect) continue;
			this.playEffect(
				effect,
				this.reference.particleReference.parentToEffectFolder,
				this.options.duration,
			);
		}
	}

	public override onRemote(): void {
		for (const effect of this.effectsCache.collect()) this.deEmit(effect);
	}
}
