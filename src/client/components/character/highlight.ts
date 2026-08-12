import { Component, Components } from "@flamework/components";
import { Dependency, type OnStart } from "@flamework/core";
import Lerps from "@rbxts/lerp-functions";
import { RunService as Run } from "@rbxts/services";
import { $nameof } from "rbxts-transform-debug";
import InstanceExtendable from "shared/base-components/instance";
import { HighlightInstanceEnum } from "shared/enums/highlight-enum";
import type { OnCharacterRemove } from "shared/hooks";
import { Create } from "shared/utility/instance";
type Attributes = typeof HighlightInstanceEnum;
const { clamp } = math;

@Component({
	tag: $nameof<HighlightComponent>(),
	defaults: HighlightInstanceEnum,
})
export class HighlightComponent<H extends Highlight = Highlight>
	extends InstanceExtendable<Attributes, H>
	implements OnStart, OnCharacterRemove
{
	public readonly initiated: boolean = false;
	public colorPromise: Maybe<Promise<void>>;
	public transparencyPromise: Maybe<Promise<void>>;
	public onStart(): void {
		super.onStart(false);
		this.addToCleanup(this.instance);
	}

	public onCharacterRemove(): void {
		this.onDestroy();
	}

	public init() {
		this.parentToCharacter();
		this.publishInit();
	}

	public lerpColor(
		color: Color3,
		duration: number,
		property: "FillColor" | "OutlineColor" = "FillColor",
	): Promise<void> {
		this.overwriteColor();
		const initialValue = this.instance[property];
		const lerpFunc = Lerps.Color3(initialValue, color);
		return (this.colorPromise = this.giveLerpPromise(lerpFunc, duration, property));
	}

	public lerpTransparency(
		transparency: number,
		duration: number,
		property: "FillTransparency" | "OutlineTransparency" = "FillTransparency",
	): Promise<void> {
		this.overwriteTransparency();
		const initialValue = this.instance[property];
		const lerpFunc = Lerps.number(initialValue, transparency);
		return (this.transparencyPromise = this.giveLerpPromise(lerpFunc, duration, property));
	}

	public overwriteColor(): void {
		if (this.colorPromise && this.colorPromise.getStatus() === "Started") this.colorPromise.cancel();
	}

	public overwriteTransparency(): void {
		if (this.transparencyPromise && this.transparencyPromise.getStatus() === "Started")
			this.transparencyPromise.cancel();
	}

	private parentToCharacter(): void {
		const reference = this.instance.FindFirstChild<ObjectValue>("Reference")!;
		this.instance.Parent = reference.Value;
	}

	private giveLerpPromise<T>(
		lerpFunc: (alpha: T) => unknown,
		duration: number,
		property: "FillTransparency" | "OutlineTransparency" | "FillColor" | "OutlineColor",
	): Promise<void> {
		return new Promise((resolve, _, onCancel) => {
			const started = os.clock();
			let cancelled = false;

			onCancel(() => {
				cancelled = true;
			});

			const step = () => {
				if (cancelled) return;

				const alpha = clamp((os.clock() - started) / duration, 0, 1);
				this.instance[property] = <never>lerpFunc(<T>(<unknown>alpha));
				if (alpha < 1) {
					Run.RenderStepped.Wait();
					step();
				} else {
					resolve();
				}
			};

			step();
		});
	}

	private publishInit(this: Writable<HighlightComponent>) {
		if (!this.initiated) this.initiated = true;
	}

	public static create(character: CharacterModel): HighlightComponent {
		return Dependency<Components>().addComponent(
			Create("Highlight", `${$nameof<HighlightComponent>()}`, undefined, (highlight) =>
				this.addReference(highlight, character),
			),
		);
	}

	public static addReference(highlight: Highlight, character: CharacterModel) {
		return Create("ObjectValue", "Reference", highlight, (obj) => {
			obj.Value = character;
		});
	}
}
