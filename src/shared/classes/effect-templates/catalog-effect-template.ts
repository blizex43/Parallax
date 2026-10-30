import { EffectCatalog } from "shared/enums/effect-enum";
import type { EffectContext, EffectName, PacketSafeEffectOptions } from "shared/structs/effect";
import { BasePartEffect } from "shared/classes/effect";

// Extend this class to customize playback while keeping the catalog's particle setup.
export abstract class CatalogEffectTemplate extends BasePartEffect {
	protected readonly name: EffectName;
	protected readonly reference: EffectContext;
	protected readonly emitCount: number;
	protected readonly MaxLifetime = 3.5;
	protected readonly DestroyOnEnd = false;

	protected constructor(
		protected readonly options: PacketSafeEffectOptions,
		name: EffectName,
	) {
		super();
		this.name = name;
		this.reference = EffectCatalog[name];
		this.emitCount = this.reference.particleReference.emissions ?? 1;
	}

	protected override OnStart(): void {
		const { character } = this.options;
		if (!character.FindFirstChild("Humanoid")) return;

		const effects = this.makeEffectMultiple(character, undefined, this.options);
		const effectList =
			effects.size() > 0 ? effects : [this.makeEffect(character, undefined, undefined, this.options)];
		for (const effect of effectList) {
			if (effect)
				this.playEffect(effect, this.reference.particleReference.parentToEffectFolder, this.options.duration);
		}
	}
}
