import { VisualEffectDecorator } from "@rbxts/refx";
import type { EffectContext, EffectName, PacketSafeEffectOptions } from "shared/structs/effect";
import { BasePartEffect } from "../effect";
import { EffectCatalog } from "shared/enums/effect-enum";
import { ClashProperties } from "shared/enums/clash-enum";
@VisualEffectDecorator
export class ClashEffect extends BasePartEffect {
	protected name: EffectName = "Clash";
	protected readonly reference: EffectContext = EffectCatalog[this.name];
	protected readonly MaxLifetime: number = ClashProperties.Duration * 2;
	protected readonly DestroyOnEnd: boolean = false;
	protected readonly emitCount: number = this.reference.particleReference.emissions ?? 1;

	constructor(protected readonly options: PacketSafeEffectOptions) {
		super();
	}

	public override OnStart(): void {
		const { character, more } = this.options;
		const humanoid = character?.FindFirstChild("Humanoid");
		if (!character || !humanoid || !more || !more.position) return;
		const effect = this.makeEffect<Attachment>(character, undefined, undefined, this.options);
		if (!effect) return;
		this.playEffect(effect, true);
	}
}
