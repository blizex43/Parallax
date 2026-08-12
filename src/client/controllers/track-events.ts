import { Controller } from "@flamework/core";
import type { OnCharacterAnimationsDeregistered, OnCharacterAnimationsRegistered } from "shared/hooks";
import type { AnimationController } from "./animation";
import { TrackEvents } from "shared/classes/track-events";

@Controller()
export class TrackEventsController
	extends TrackEvents
	implements OnCharacterAnimationsRegistered, OnCharacterAnimationsDeregistered
{
	public constructor(controller: AnimationController) {
		super(controller);
	}
}
