import { Component, Components } from "@flamework/components";
import { Dependency, type OnStart } from "@flamework/core";
import { TweenService } from "@rbxts/services";
import { $nameof } from "rbxts-transform-debug";
import InstanceExtendable from "shared/base-components/instance";
import { HighlightInstanceEnum } from "shared/enums/highlight-enum";
import type { OnCharacterRemove } from "shared/hooks";
import { Create } from "shared/utility/instance";

type Attributes = typeof HighlightInstanceEnum;
export type HighlightProperties = Partial<
	Pick<Highlight, "FillColor" | "OutlineColor" | "FillTransparency" | "OutlineTransparency" | "DepthMode">
>;
export type HighlightTweenProperties = Partial<
	Pick<Highlight, "FillColor" | "OutlineColor" | "FillTransparency" | "OutlineTransparency">
>;

export interface HighlightTweenOptions {
	duration?: number;
	easingStyle?: Enum.EasingStyle;
	easingDirection?: Enum.EasingDirection;
	repeatCount?: number;
	reverses?: boolean;
	delayTime?: number;
}

@Component({
	tag: $nameof<HighlightComponent>(),
	defaults: HighlightInstanceEnum,
})
export class HighlightComponent
	extends InstanceExtendable<Attributes, Highlight>
	implements OnStart, OnCharacterRemove
{
	public initiated = false;
	private readonly propertyTweens = new Map<string, Tween>();

	public onStart(): void {
		super.onStart(false);
		this.addToCleanup(this.instance);
	}

	public onCharacterRemove(): void {
		this.onDestroy();
	}

	public init(): void {
		this.parentToCharacter();
		this.initiated = true;
	}

	public configure(properties: HighlightProperties): void {
		if (properties.FillColor !== undefined) this.instance.FillColor = properties.FillColor;
		if (properties.OutlineColor !== undefined) this.instance.OutlineColor = properties.OutlineColor;
		if (properties.FillTransparency !== undefined) this.instance.FillTransparency = properties.FillTransparency;
		if (properties.OutlineTransparency !== undefined)
			this.instance.OutlineTransparency = properties.OutlineTransparency;
		if (properties.DepthMode !== undefined) this.instance.DepthMode = properties.DepthMode;
	}

	public tween(properties: HighlightTweenProperties, options: HighlightTweenOptions | number = 0): Tween {
		const tweenOptions = typeIs(options, "number") ? { duration: options } : options;
		const allKeys = <const>["FillColor", "OutlineColor", "FillTransparency", "OutlineTransparency"];
		const keys = allKeys.filter((key) => properties[key] !== undefined);
		for (const key of keys) this.propertyTweens.get(key)?.Cancel();

		const tween = TweenService.Create(
			this.instance,
			new TweenInfo(
				tweenOptions.duration ?? 0,
				tweenOptions.easingStyle ?? Enum.EasingStyle.Quad,
				tweenOptions.easingDirection ?? Enum.EasingDirection.Out,
				tweenOptions.repeatCount ?? 0,
				tweenOptions.reverses ?? false,
				tweenOptions.delayTime ?? 0,
			),
			properties,
		);

		for (const key of keys) this.propertyTweens.set(key, tween);
		this.addToCleanup(
			tween.Completed.Connect(() => {
				for (const key of keys) if (this.propertyTweens.get(key) === tween) this.propertyTweens.delete(key);
			}),
		);
		this.addToCleanup(tween);
		tween.Play();
		return tween;
	}

	public tweenColor(color: Color3, duration: number, property: "FillColor" | "OutlineColor" = "FillColor"): Tween {
		return this.tween(property === "FillColor" ? { FillColor: color } : { OutlineColor: color }, { duration });
	}

	public tweenTransparency(
		transparency: number,
		duration: number,
		property: "FillTransparency" | "OutlineTransparency" = "FillTransparency",
	): Tween {
		return this.tween(
			property === "FillTransparency"
				? { FillTransparency: transparency }
				: { OutlineTransparency: transparency },
			{ duration },
		);
	}

	private parentToCharacter(): void {
		const reference = this.instance.FindFirstChild<ObjectValue>("Reference")!;
		this.instance.Parent = reference.Value;
	}

	public static create(character: CharacterModel): HighlightComponent {
		return Dependency<Components>().addComponent(
			Create("Highlight", `${$nameof<HighlightComponent>()}`, undefined, (highlight) =>
				this.addReference(highlight, character),
			),
		);
	}

	public static addReference(highlight: Highlight, character: CharacterModel): ObjectValue {
		return Create("ObjectValue", "Reference", highlight, (obj) => {
			obj.Value = character;
		});
	}
}
