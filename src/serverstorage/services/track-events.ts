import { Controller } from "@flamework/core";
import type { OnCharacterAnimationsDeregistered, OnCharacterAnimationsRegistered } from "shared/hooks";
import { TrackEvents } from "shared/classes/track-events";
import type { AnimationService } from "./animation";

@Controller()
export class TrackEventsService
	extends TrackEvents
	implements OnCharacterAnimationsRegistered, OnCharacterAnimationsDeregistered
{
	public constructor(service: AnimationService) {
		super(service);
	}
}
