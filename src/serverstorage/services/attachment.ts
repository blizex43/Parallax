import { OnInit, Service } from "@flamework/core";
import { PlayerDataKeys } from "shared/data-models/player-data";
import { OnCharacterAdd } from "shared/hooks";
import type { CharacterLimbsType } from "shared/structs/model";
import { getCharacterLimbs, getChildAttachments, getHeightFromHumanoid } from "shared/utility/basepart";
import { Create } from "shared/utility/instance";
import { DataService } from "./third-party/data";
@Service()
export class AttachmentService implements OnCharacterAdd, OnInit {
	public readonly changableKeys: PlayerDataKeys[] = ["height", "heightboost"];
	private readonly limbs: Partial<CharacterLimbsType>[] = ["Left Arm", "Right Arm", "Left Leg", "Right Leg"];
	constructor(private readonly database: DataService) {}
	public onInit(): void | Promise<void> {
		this.database.updated.Connect(
			(player, _, keys) => keys.some((key) => this.changableKeys.includes(key)) && this.onChanged(player),
		);
	}

	public onCharacterAdd(character: CharacterModel): void {
		if (this.getPalmAttachments(character).isEmpty()) this.addPalmAttachments(character);
	}

	public async onChanged(player: Player): Promise<void> {
		const character = <Maybe<CharacterModel>>player.Character;
		if (!character) return;
		const attachments = this.getPalmAttachments(character);
		if (!attachments.isEmpty()) this.adjustPalmAttachments(character, attachments);
	}

	private getPalmAttachments(character: CharacterModel): Attachment[] {
		return getChildAttachments(character, "PalmAttachment", this.limbs);
	}

	private addPalmAttachments(character: CharacterModel): void {
		const humanoid = character.FindFirstChild("Humanoid") ?? character.WaitForChild("Humanoid", 3);
		if (!humanoid) return;
		for (const instance of getCharacterLimbs(character, this.limbs))
			Create(
				"Attachment",
				"PalmAttachment",
				instance,
				(attachment) => (attachment.CFrame = new CFrame(0, -getHeightFromHumanoid(humanoid), 0)),
			);
	}

	private adjustPalmAttachments(character: CharacterModel, attachments: Attachment[]): void {
		const humanoid = character.FindFirstChild("Humanoid");
		if (!humanoid) return;
		for (const attachment of attachments) attachment.CFrame = new CFrame(0, -getHeightFromHumanoid(humanoid), 0);
	}
}
