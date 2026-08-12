import { VisualEffectDecorator } from "@rbxts/refx";
import type { EffectContext, EffectName, PacketSafeEffectOptions } from "shared/structs/effect";
import { BasePartEffect } from "../effect";
import { EffectCatalog } from "shared/enums/effect-catalog-enum";
@VisualEffectDecorator
export class StarTrailEffect extends BasePartEffect {
	protected name: EffectName = "Star-Trail";
	protected readonly reference: EffectContext = EffectCatalog[this.name];
	protected readonly MaxLifetime: number = 3.5;
	protected readonly DestroyOnEnd: boolean = false;
	protected readonly emitCount: number = this.reference.particleReference.emissions ?? 1;

	constructor(protected readonly options: PacketSafeEffectOptions) {
		super();
	}

	public override OnStart(): void {
		const { character } = this.options;
		const humanoid = character?.FindFirstChild("Humanoid");
		const duration = this.options.duration;
		if (!character || !humanoid) return;
		const effects = this.makeEffectMultiple(character, undefined, this.options);
		if (!effects || effects.isEmpty()) return;
		for (const effect of effects) this.playEffect(effect, false, duration);
	}

	public onRemote(): void {
		const effects = this.effectsCache.collect();
		if (effects.isEmpty()) return;
		for (const effect of effects) this.deEmit(effect);
	}
}
