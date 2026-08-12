import { Service } from "@flamework/core";
import type { AnimationService } from "./animation";
import type { PushService } from "./push";
import type { TeleportService } from "./teleport";
import type { HumanoidService } from "./humanoid";
import type { StateDependerService } from "./state-depender";
import type { AttachmentService } from "./attachment";

@Service()
export class RegisterService {
	constructor(
		private readonly humanoid: HumanoidService,
		private readonly anim: AnimationService,
		private readonly push: PushService,
		private readonly teleport: TeleportService,
		private readonly wsDepender: StateDependerService,
		private readonly attachment: AttachmentService,
	) { }
	public set(character: CharacterModel): void {
		return this.otherPublishes(character);
	}

	public del(character: CharacterModel): void {
		this.otherRemovePublishes(character);
	}

	private otherPublishes(character: CharacterModel): void {
		this.humanoid.onCharacterAdd(character);
		this.anim.onCharacterAdd(character);
		this.push.onCharacterAdd(character);
		this.teleport.onCharacterAdd(character);
		this.wsDepender.onCharacterAdd(character);
		this.attachment.onCharacterAdd(character);
	}

	private otherRemovePublishes(character: CharacterModel): void {
		this.humanoid.onCharacterRemove(character);
		this.anim.onCharacterRemove(character);
		this.push.onCharacterRemove(character);
		this.teleport.onCharacterRemove(character);
		this.wsDepender.onCharacterRemove(character);
	}
}
