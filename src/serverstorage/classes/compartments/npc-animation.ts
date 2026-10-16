import { isString } from "shared/utility/t-isA";

export class NpcAnimationCompartment {
	private currentAnimation?: string;
	private currentSpeed = 1;

	public constructor(private readonly character: CharacterModel) {}

	public setLocomotion(animation: "idle" | "walk", speed: number, combatEquipped: boolean): void {
		const style = this.character.GetAttribute("Style");
		const stance = this.character.GetAttribute("Stance");
		const name =
			combatEquipped && isString(style) && isString(stance)
				? `${style}:${stance}:${animation}`.lower()
				: animation;
		if (this.currentAnimation === name && this.currentSpeed === speed) return;

		this.currentAnimation = name;
		this.currentSpeed = speed;
		this.character.SetAttribute("NPCAnimation", name);
		this.character.SetAttribute("NPCAnimationSpeed", speed);
	}
}
