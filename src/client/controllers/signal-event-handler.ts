import { Controller } from "@flamework/core";
import { Janitor } from "@rbxts/janitor";
import type { OnCharacterAdd, OnCharacterRemove } from "shared/hooks";
import { Events } from "client/network";
import { Serializers } from "shared/network";
import { Player } from "client/utility";
import type { TrackEventSignal } from "shared/structs/trackvents";
import { Players } from "@rbxts/services";
import type { TrackEventsController } from "./track-events";
import { MovementState } from "shared/enums/config-enum";
import type { JournalController } from "./journal";

@Controller()
export class SignalEventHandlerController implements OnCharacterAdd, OnCharacterRemove {
	private readonly janitor: Janitor = new Janitor();
	public constructor(
		private readonly trackEvent: TrackEventsController,
		private readonly journal: JournalController,
	) {}

	public async onCharacterAdd(character: CharacterModel): Promise<void> {
		await this.trackEvent.getCharacterRegistered(character);
		this.hookCharacterEvents(character);
	}

	public onCharacterRemove(): void {
		this.janitor.Cleanup();
	}

	private hookCharacterEvents(character: CharacterModel) {
		const { util } = this.journal
		const connect = (signal: TrackEventSignal, alternate: boolean, walking: boolean = false) => {
			this.janitor.Add(
				signal.Connect(() => {
					if (walking && util.read(MovementState.Sprint)) return;
					Events.effect.replicate.predict(
						Serializers.effect.serialize({
							name: "Footstep",
							options: {
								alternate,
								character,
								players: [Player],
								timeout: 0.1,
							},
						}),
					);

					Events.effect.replicate.fire(
						Serializers.effect.serialize({
							name: "Footstep",
							options: {
								alternate,
								character,
								players: Players.GetPlayers().filter((player) => player !== Player),
								timeout: 0.1,
							},
						}),
					);
				}),
			);
		};
		const lWalkSig = this.trackEvent.getEventSignal(character, "walk", "FootstepLeft")!;
		const rWalkSig = this.trackEvent.getEventSignal(character, "walk", "FootstepRight")!;
		const lRunSig = this.trackEvent.getEventSignal(character, "sprint", "FootstepLeft")!;
		const rRunSig = this.trackEvent.getEventSignal(character, "sprint", "FootstepRight")!;

		connect(this.janitor.Add(lWalkSig), false, true);
		connect(this.janitor.Add(rWalkSig), true, true);
		connect(this.janitor.Add(lRunSig), false);
		connect(this.janitor.Add(rRunSig), true);
	}
}
