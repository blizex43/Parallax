import { Controller } from "@flamework/core";
import { HighlightComponent } from "client/components/character/highlight";
import type {
	HighlightProperties,
	HighlightTweenOptions,
	HighlightTweenProperties,
} from "client/components/character/highlight";
import { SuperJanitor } from "shared/classes/super-janitor";
import type { OnCharacterAdd, OnCharacterRemove } from "shared/hooks";

@Controller()
export class HighlightController implements OnCharacterRemove, OnCharacterAdd {
	private readonly highlights: Map<CharacterModel, HighlightComponent> = new Map();
	public apply(character: CharacterModel, properties?: HighlightProperties): void {
		const component = this.get(character, true);
		if (!component) return;
		if (properties) component.configure(properties);
		if (!component.initiated) component.init();
	}

	public tween(
		character: CharacterModel,
		properties: HighlightTweenProperties,
		options: HighlightTweenOptions | number = 0,
	): Maybe<Tween> {
		const component = this.get(character);
		if (!component) return;
		return component.tween(properties, options);
	}

	public lerpColor(
		character: CharacterModel,
		color: Color3,
		duration: number = 0,
		property: "FillColor" | "OutlineColor" = "FillColor",
		reverseDelay?: number,
		reverseDelayValue?: Color3,
	): Maybe<Tween> {
		const component = this.get(character);
		if (!component) return;
		const tween = component.tweenColor(color, duration, property);
		SuperJanitor.set(`${character.Name}_Highlight_Color`, tween);
		if (reverseDelay !== undefined && reverseDelayValue !== undefined)
			SuperJanitor.set(
				`${character.Name}_Highlight_Color_Reverse`,
				() =>
					tween.PlaybackState === Enum.PlaybackState.Completed &&
					component.tweenColor(reverseDelayValue, duration, property),
				reverseDelay,
			);
		return tween;
	}

	public lerpTransparency(
		character: CharacterModel,
		transparency: number,
		duration: number = 0,
		property: "FillTransparency" | "OutlineTransparency" = "FillTransparency",
		rememberExisting?: boolean,
		reverseDelay?: number,
		reverseDelayValue?: number,
	): Maybe<Tween> {
		if (rememberExisting) {
			const existing = SuperJanitor.get(`${character.Name}_Highlight_Transparency`);
			if (existing) return;
		}
		const component = this.get(character);
		if (!component) return;
		const tween = component.tweenTransparency(transparency, duration, property);
		SuperJanitor.set(`${character.Name}_Highlight_Transparency`, tween);
		if (reverseDelay !== undefined && reverseDelayValue !== undefined)
			SuperJanitor.set(
				`${character.Name}_Highlight_Transparency_Reverse`,
				() =>
					tween.PlaybackState === Enum.PlaybackState.Completed &&
					component.tweenTransparency(reverseDelayValue, duration, property),
				reverseDelay,
			);
		return tween;
	}

	public get(character: CharacterModel, force: boolean = false): Maybe<HighlightComponent> {
		const existing = this.highlights.get(character);
		if (existing) return existing;
		if (force) return this.set(character);
		return undefined;
	}

	public set(character: CharacterModel): HighlightComponent {
		const component = HighlightComponent.create(character);
		this.highlights.set(character, component);
		return component;
	}

	public onCharacterAdd(character: CharacterModel): void {
		this.apply(character);
	}

	public onCharacterRemove(character: CharacterModel): void {
		const highlight = this.get(character);
		if (highlight) highlight.onDestroy();
		this.highlights.delete(character);
	}
}
