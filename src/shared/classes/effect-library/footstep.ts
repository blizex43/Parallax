import { VisualEffectDecorator } from "@rbxts/refx";
import { ReplicatedStorage } from "@rbxts/services";
import type { EffectContext, EffectName, EffectReferenceType, PacketSafeEffectOptions } from "shared/structs/effect";
import { BasePartEffect } from "../effect";
import { getGroundMaterial, isMovingBackwards } from "shared/utility/basepart";
import { EffectCatalog } from "shared/enums/effect-enum";
@VisualEffectDecorator
export class FootstepEffect extends BasePartEffect {
	protected name: EffectName = "Footstep";
	protected readonly reference: EffectContext = EffectCatalog[this.name];
	protected readonly soundReference = ReplicatedStorage.Assets.Sounds.Footstep;
	protected readonly MaxLifetime: number = 2;
	protected readonly DestroyOnEnd: boolean = false;
	protected readonly emitCount: number = this.reference.particleReference.emissions ?? 1;

	constructor(protected readonly options: PacketSafeEffectOptions) {
		super();
	}

	public override OnStart(): void {
		const { character } = this.options;
		const humanoid = character?.FindFirstChild("Humanoid");
		if (!character || !humanoid) return;
		const effect = this.makeEffect(
			character,
			() => (getGroundMaterial(humanoid, [Enum.Material.Grass]) ? "Grassy" : "Normal"),
			(effect) => this.transformPos(character, effect),
		);
		if (!effect) return;
		this.playSound(
			effect,
			this.makeSound(
				() =>
					(
						getGroundMaterial(character.Humanoid, [
							Enum.Material.Wood,
							Enum.Material.Concrete,
							Enum.Material.Sand,
							Enum.Material.Grass,
							Enum.Material.Ground,
						]) ?? Enum.Material.Concrete
					).Name,
			),
		);
		this.playEffect(effect, true);
	}
	private transformPos(character: CharacterModel, effect: EffectReferenceType): EffectReferenceType {
		const root = character.HumanoidRootPart;
		const humanoid = character.Humanoid;
		const movingBackwards = isMovingBackwards(root, humanoid);
		const sideOffset = root.CFrame.RightVector.mul(this.options.alternate ? 1 : -1).mul(movingBackwards ? -1 : 1);
		const forwardOffset = root.CFrame.LookVector.mul(movingBackwards ? -1 : 1);
		effect.Position = effect.Position.add(sideOffset).add(forwardOffset);
		return effect;
	}
}
