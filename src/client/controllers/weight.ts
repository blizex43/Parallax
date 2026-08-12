import { Controller } from "@flamework/core";
import type { OnCharacterAdd } from "shared/hooks";
import type { CharacterController } from "./character";
import { RootCustomPhysicalProperties, WeightlessLimbsEnum } from "shared/enums/weight-enum";
import { isBasePart } from "shared/utility/t-isA";
import type { CharacterLimbsType } from "shared/structs/model";

@Controller()
export class WeightController implements OnCharacterAdd {
	public constructor(private readonly character: CharacterController) {}
	public onCharacterAdd(character: CharacterModel): void {
		this.setSpecificWeightless(character);
		this.modifyRootPhysicalProperties(character);
	}

	private setSpecificWeightless(character: CharacterModel): void {
		for (const basePart of character.GetChildren<BasePart>())
			if (isBasePart(basePart) && WeightlessLimbsEnum.includes(<CharacterLimbsType>basePart.Name))
				basePart.Massless = true;
	}

	private async modifyRootPhysicalProperties(character: CharacterModel): Promise<void> {
		const root = character.FindFirstChild("HumanoidRootPart") ?? (await this.character.mustGetRoot());
		root.CustomPhysicalProperties = RootCustomPhysicalProperties;
	}
}
