import type { ClientAmbiguousEvents, ClientMarkerEventNamesTable } from "shared/enums/track-events-enum";
import type { AnimationTrackNames } from "./animation";
import type Signal from "@rbxts/signal";
import type { TrackComponent } from "shared/components/track";
export type TrackEvent = (typeof ClientMarkerEventNamesTable)[number];
export type TrackEventSignalParameters = [character: CharacterModel, track: TrackComponent, event: TrackEvent];
export type TrackEventSignal = Signal<(t: TrackEventSignalParameters) => void>;
export type TrackEventCacheTable = Record<AnimationTrackNames, ActiveTrackEventTable[]>;
export type TrackAmbiguousEventsType = (typeof ClientAmbiguousEvents)[number];
export interface AnimComponentType {
	getTrack(character: CharacterModel, trackName: AnimationTrackNames): Maybe<TrackComponent>;
}
export interface TrackEventObject {
	track: AnimationTrackNames;
	events: TrackEvent[];
}
export interface ActiveTrackEventTable {
	name: AnimationTrackNames;
	event: TrackEvent;
	signal: TrackEventSignal;
}
