import { Controller } from "@flamework/core";
import { HighlightComponent } from "client/components/character/highlight";
import { SuperJanitor } from "shared/classes/super-janitor";
import { OnCharacterAdd, OnCharacterRemove } from "shared/hooks";

@Controller()
export class HighlightController implements OnCharacterRemove, OnCharacterAdd {
	private readonly highlights: Map<CharacterModel, HighlightComponent> = new Map();
	public apply(character: CharacterModel) {
		const component = this.get(character, true)!;
		if (!component.initiated) component.init();
	}

	public lerpColor(
		character: CharacterModel,
		color: Color3,
		duration: number = 0,
		property: "FillColor" | "OutlineColor" = "FillColor",
		reverseDelay?: number,
		reverseDelayValue?: Color3,
	) {
		const component = this.get(character);
		if (component) {
			const promise = component.lerpColor(color, duration, property);
			SuperJanitor.set(`${character.Name}_Highlight_Color`, promise);
			if (reverseDelay && reverseDelayValue)
				SuperJanitor.set(
					`${character.Name}_Highlight_Color_Reverse`,
					() =>
						promise.getStatus() === "Resolved" &&
						promise === component.colorPromise &&
						component.lerpColor(reverseDelayValue, duration, property),
					reverseDelay,
				);
		}
	}

	public async lerpTransparency(
		character: CharacterModel,
		transparency: number,
		duration: number = 0,
		property: "FillTransparency" | "OutlineTransparency" = "FillTransparency",
		rememberExisting?: boolean,
		reverseDelay?: number,
		reverseDelayValue?: number,
	) {
		if (rememberExisting) {
			const existing = SuperJanitor.get(`${character.Name}_Highlight_Transparency`);
			if (existing) return;
		}
		const component = this.get(character);
		if (component) {
			const promise = component.lerpTransparency(transparency, duration, property);
			SuperJanitor.set(`${character.Name}_Highlight_Transparency`, promise);
			if (reverseDelay && reverseDelayValue)
				SuperJanitor.set(
					`${character.Name}_Highlight_Transparency_Reverse`,
					() =>
						promise.getStatus() === "Resolved" &&
						promise === component.transparencyPromise &&
						component.lerpTransparency(reverseDelayValue, duration, property),
					reverseDelay,
				);
		}
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
	}
}
