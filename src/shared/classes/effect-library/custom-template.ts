import { VisualEffectDecorator } from "@rbxts/refx";
import type { EffectName, PacketSafeEffectOptions } from "shared/structs/effect";
import { CatalogEffectTemplate } from "shared/classes/effect-templates/catalog-effect-template";

@VisualEffectDecorator
export class CustomTemplateEffect extends CatalogEffectTemplate {
	public constructor(options: PacketSafeEffectOptions, name?: EffectName) {
		super(options, name ?? "Light-Hit");
	}
}
