import { VisualEffectDecorator } from "@rbxts/refx";
import type { EffectContext, EffectName, PacketSafeEffectOptions } from "shared/structs/effect";
import { BasePartEffect } from "../effect";
import { EffectCatalog } from "shared/enums/effect-enum";
@VisualEffectDecorator
export class LightHitEffect extends BasePartEffect {
	protected name: EffectName = "Light-Hit";
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
		if (!character || !humanoid) return;
		const effect = this.makeEffect(character, undefined, undefined, this.options);
		if (!effect) return;
		this.playEffect(effect);
	}
}
