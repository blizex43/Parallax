import { Controller, type OnStart } from "@flamework/core";
import type { HighlightController } from "client/controllers/highlight";
import { Events } from "client/network";
import { DodgeProperties } from "shared/enums/dodge-enum";
import type { OnCharacterAdd, OnCharacterRemove } from "shared/hooks";
import type { ReplicaController } from "./replica";
import type { CharacterController } from "./character";

@Controller()
export class DodgeController implements OnCharacterAdd, OnCharacterRemove, OnStart {
	private cooldownEndsAt = 0;
	private activeDodgeId = 0;

	public constructor(
		private readonly character: CharacterController,
		private readonly highlight: HighlightController,
		private readonly replica: ReplicaController,
	) {}

	public onStart(): void {
		Events.game.dodgeReset.connect(() => {
			this.cooldownEndsAt = 0;
			this.finishHighlight();
		});
	}

	public attempt(): void {
		const character = this.character.get();
		const now = os.clock();
		if (!character || now < this.cooldownEndsAt) return;

		this.cooldownEndsAt = now + DodgeProperties.cooldown;
		this.activeDodgeId++;
		const dodgeId = this.activeDodgeId;
		const color = this.replica.getData().auraColor;
		this.highlight.apply(character, {
			FillColor: color,
			OutlineColor: color,
			FillTransparency: DodgeProperties.highlightStartTransparency,
			OutlineTransparency: DodgeProperties.highlightStartTransparency,
		});
		this.highlight.tween(
			character,
			{ FillTransparency: 0, OutlineTransparency: 0 },
			{ duration: DodgeProperties.highlightInDuration },
		);
		Events.game.dodge.fire();

		task.delay(DodgeProperties.evadeWindow, () => {
			if (this.activeDodgeId === dodgeId) this.finishHighlight();
		});
	}

	public onCharacterAdd(): void {
		this.cooldownEndsAt = 0;
		this.activeDodgeId++;
	}

	public onCharacterRemove(): void {
		this.cooldownEndsAt = 0;
		this.activeDodgeId++;
	}

	private finishHighlight(): void {
		this.activeDodgeId++;
		const character = this.character.get();
		if (!character) return;
		this.highlight.tween(
			character,
			{ FillTransparency: 1, OutlineTransparency: 1 },
			{ duration: DodgeProperties.highlightOutDuration },
		);
	}
}
