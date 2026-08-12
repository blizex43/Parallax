import type { TrackEventObject } from "shared/structs/trackvents";
export const ClientMarkerEventNamesTable = <const>["FootstepLeft", "FootstepRight", "Slow", "SlowEnd", "Closing"];
export const ClientAmbiguousEvents = <const>["Start", "End"];
export const ClientMarkerEventsTable: TrackEventObject[] = [
	{
		track: "walk",
		events: ["FootstepLeft", "FootstepRight"],
	},
	{
		track: "sprint",
		events: ["FootstepLeft", "FootstepRight"],
	},
];