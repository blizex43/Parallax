import Object from "@rbxts/object-utils";
import Signal from "@rbxts/signal";
import type { TrackComponent } from "shared/components/track";
import { ClientMarkerEventsTable } from "shared/enums/track-events-enum";
import type { AnimationTrackComponentRecord, AnimationTrackNames } from "shared/structs/animation";
import type {
	ActiveTrackEventTable,
	AnimComponentType,
	TrackEvent,
	TrackEventCacheTable,
	TrackEventSignal,
	TrackEventSignalParameters,
} from "shared/structs/trackvents";

export abstract class TrackEvents {
	private readonly trackCache: Map<CharacterModel, TrackEventCacheTable> = new Map();
	private readonly onCharacterRegistered: Signal<
		(t: { character: CharacterModel; data: TrackEventCacheTable }) => void
	> = new Signal();
	constructor(private readonly animation: AnimComponentType) {}
	public onCharacterAnimationsRegistered(character: CharacterModel, tracks: AnimationTrackComponentRecord): void {
		this.reconcileMarkers(character, tracks);
	}

	public async getCharacterRegistered(character: CharacterModel): Promise<TrackEventCacheTable> {
		const existing = this.get(character);
		if (existing) return existing;
		let data;
		do {
			const fetch = await Promise.fromEvent(this.onCharacterRegistered);
			if (fetch.character === character) data = fetch.data;
		} while (!data);
		return data;
	}

	public getEventPromise(
		character: CharacterModel,
		trackName: AnimationTrackNames,
		name: TrackEvent,
	): Maybe<Promise<TrackEventSignalParameters>> {
		const root = this.getRootFromCharacter(character);
		if (!root) return;
		for (const actives of root)
			for (const active of actives)
				if (active.event === name && active.name === trackName) return Promise.fromEvent(active.signal);
		return;
	}

	public getEventSignal(
		character: CharacterModel,
		trackName: AnimationTrackNames,
		eventName: TrackEvent,
	): Maybe<TrackEventSignal> {
		const root = this.getRootFromCharacter(character);
		if (!root) return;
		for (const actives of root)
			for (const active of actives)
				if (active.event === eventName && active.name === trackName) return active.signal;
		return;
	}

	public onCharacterAnimationsDeregistered(character: CharacterModel): void {
		this.delFromCache(character);
	}

	public destroyTable(active: ActiveTrackEventTable): void {
		if (active.signal) active.signal.Destroy();
	}

	public manualSignTrack(
		character: CharacterModel,
		trackName: AnimationTrackNames,
		event: TrackEvent,
	): Maybe<ActiveTrackEventTable> {
		const track = this.animation.getTrack(character, trackName);
		const data = this.get(character);
		if (!data || !track) return;
		const cache = this.hasEvent(data, trackName, event);
		if (cache) return cache;
		const signed = this.signTrack(character, track, trackName, event);
		data[trackName].push(signed);
		this.set(character, data);
		return signed;
	}

	private signTrack(
		character: CharacterModel,
		track: TrackComponent,
		trackName: AnimationTrackNames,
		event: TrackEvent,
	): ActiveTrackEventTable {
		const signal: TrackEventSignal = track.subscribe(event, character, track, event);
		const signed: ActiveTrackEventTable = {
			name: trackName,
			signal,
			event,
		};
		return signed;
	}

	private reconcileMarkers(character: CharacterModel, tracks: AnimationTrackComponentRecord): void {
		const data = <TrackEventCacheTable>{};
		for (const eventIndex of ClientMarkerEventsTable) {
			if (eventIndex.track in tracks) {
				const track = tracks[eventIndex.track];
				data[eventIndex.track] = [];
				for (const event of eventIndex.events)
					if (!this.hasEvent(data, eventIndex.track, event))
						data[eventIndex.track].push(this.signTrack(character, track, eventIndex.track, event));
			}
		}
		this.set(character, data);
		this.onCharacterRegistered.Fire({ character, data });
	}

	private hasEvent(
		data: TrackEventCacheTable,
		trackName: AnimationTrackNames,
		event: TrackEvent,
	): Maybe<ActiveTrackEventTable> {
		if (!(trackName in data)) {
			data[trackName] = [];
			return;
		}
		for (const active of data[trackName]) if (active.event === event) return active;
		return;
	}

	private delFromCache(character: CharacterModel): void {
		const root = this.getRootFromCharacter(character);
		if (!root) return;
		for (const actives of root) for (const active of actives) this.destroyTable(active);

		this.trackCache.delete(character);
	}

	private getRoot(cache: TrackEventCacheTable): ActiveTrackEventTable[][] {
		return Object.values(cache);
	}

	private getRootFromCharacter(character: CharacterModel): Maybe<ActiveTrackEventTable[][]> {
		const cache = this.get(character);
		if (!cache) return;
		return this.getRoot(cache);
	}

	private set(character: CharacterModel, data: TrackEventCacheTable) {
		return void this.trackCache.set(character, data);
	}

	private get(character: CharacterModel): Maybe<TrackEventCacheTable> {
		return this.trackCache.get(character);
	}
}
