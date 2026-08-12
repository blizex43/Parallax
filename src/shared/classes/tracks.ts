import Object from "@rbxts/object-utils";
import Signal from "@rbxts/signal";
import { $warn } from "rbxts-transform-debug";
import { TrackComponent } from "shared/components/track";
import { animationOverrides, OVERRIDES_TEMPLATE } from "shared/enums/animation-enum";
import type {
	AnimationOffsets,
	AnimationTrackComponentRecord,
	AnimationTrackNames,
	AnimationTrackRecord,
} from "shared/structs/animation";

export abstract class TrackHandler {
	public readonly initiatedPlayers: Player[] = [];
	private readonly registered: Map<CharacterModel, AnimationTrackComponentRecord> = new Map();
	public readonly onRegistered: Signal<(character: CharacterModel, tracks: AnimationTrackComponentRecord) => void> =
		new Signal();
	public readonly onDeregistered: Signal<(character: CharacterModel) => void> = new Signal();
	protected async registerCharacter(
		character: CharacterModel,
		tracks: AnimationTrackRecord,
	): Promise<typeof this.registered> {
		return await this.register(character, tracks);
	}

	protected async deregisterCharacter(
		character: CharacterModel,
		destroy: boolean = true,
	): Promise<typeof this.registered> {
		return await this.deregister(character, destroy);
	}

	public playAnim(
		character: CharacterModel,
		animName: AnimationTrackNames,
		stopOthers: boolean = true,
		offsets: AnimationOffsets = { speed: 1, fade: 1 },
		tracks?: AnimationTrackComponentRecord,
	) {
		tracks ??= this.getTracks(character);
		if (!tracks) return;
		if (stopOthers) this.stopOthers(tracks, animName);
		try {
			const track = tracks[animName];
			track
				.modifyFade(this.getFade(animName) * (offsets.fade ?? 1))
				.modifySpeed(this.getSpeed(animName) * (offsets.speed ?? 1));
			track.play();
		} catch (e) {
			$warn(e);
		}
	}

	public adjustSpeed(character: CharacterModel, animName: AnimationTrackNames, speed: number) {
		const tracks = this.getTracks(character);
		if (!tracks) return;
		if (tracks[animName].playing()) {
			tracks[animName].modifySpeed(speed);
		}
	}

	public isPlaying(character: CharacterModel, animName: AnimationTrackNames): boolean {
		const tracks = this.getTracks(character);
		if (!tracks) return false;
		return tracks[animName].playing();
	}

	public stopAnim(character: CharacterModel, animName: AnimationTrackNames) {
		const tracks = this.getTracks(character);
		if (!tracks) return;
		try {
			tracks[animName].stop();
		} catch (e) {
			$warn(e);
		}
	}

	public isRegistered(character: CharacterModel): boolean {
		return (this.registered.get(character) && true) || false;
	}

	public getTrackNames(character: CharacterModel): Maybe<AnimationTrackNames[]> {
		return Object.keys(<AnimationTrackComponentRecord>(this.getTracks(character) ?? {}));
	}

	public getTracks(character: CharacterModel): Maybe<AnimationTrackComponentRecord> {
		return this.registered.get(character);
	}

	public getTrack(character: CharacterModel, name: AnimationTrackNames): Maybe<TrackComponent> {
		const track = this.registered.get(character)?.[name];
		if (!track || track.length() === 0) return;
		return track;
	}

	private stopOthers(
		tracks: AnimationTrackComponentRecord,
		animName: AnimationTrackNames,
		ignoreGrade: boolean = false,
	) {
		const grade = this.getGrade(animName);
		for (const [trackName, track] of pairs(tracks)) {
			if (
				animName !== trackName &&
				track.playing() &&
				!ignoreGrade &&
				grade >= this.getGrade(trackName) &&
				this.getAutoStoppable(animName)
			)
				track.stop();
		}
	}

	private getGrade(animName: AnimationTrackNames): number {
		return animationOverrides[animName]?.grade ?? OVERRIDES_TEMPLATE.grade;
	}

	private getSigmoidable(animName: AnimationTrackNames): boolean {
		return animationOverrides[animName]?.acceptsSigmoid ?? OVERRIDES_TEMPLATE.acceptsSigmoid;
	}

	private getAutoStoppable(animName: AnimationTrackNames): boolean {
		return animationOverrides[animName]?.autoStoppable ?? OVERRIDES_TEMPLATE.autoStoppable;
	}

	private getSpeed(animName: AnimationTrackNames): number {
		return animationOverrides[animName]?.speed ?? OVERRIDES_TEMPLATE.speed;
	}

	private getWeight(animName: AnimationTrackNames): number {
		return animationOverrides[animName]?.weight ?? OVERRIDES_TEMPLATE.weight;
	}

	private getFade(animName: AnimationTrackNames): number {
		return animationOverrides[animName]?.fade ?? OVERRIDES_TEMPLATE.fade;
	}

	private getLerpFade(animName: AnimationTrackNames): number {
		return animationOverrides[animName]?.lerpFade ?? OVERRIDES_TEMPLATE.lerpFade;
	}

	private getLoop(animName: AnimationTrackNames): boolean {
		return animationOverrides[animName]?.loop ?? OVERRIDES_TEMPLATE.loop;
	}

	private getPriority(animName: AnimationTrackNames): Enum.AnimationPriority {
		return animationOverrides[animName]?.priority ?? OVERRIDES_TEMPLATE.priority;
	}

	private async deregister(
		character: CharacterModel,
		destroy: boolean,
	): Promise<Map<CharacterModel, AnimationTrackComponentRecord>> {
		if (destroy) this.destroyTracks(this.getTracks(character));
		this.registered.delete(character);
		this.onDeregistered.Fire(character);
		return this.registered;
	}

	private destroyTracks(tracks: Maybe<AnimationTrackComponentRecord>): void {
		if (!tracks) return;
		for (const track of Object.values(tracks)) track.onDestroy();
	}

	private async register(character: CharacterModel, tracks: AnimationTrackRecord): Promise<typeof this.registered> {
		const trackRecord = this.trackToComponent(tracks);
		await this.initializeTracks(trackRecord);
		const container = <AnimationTrackComponentRecord>this.getTracks(character) ?? {};
		this.registered.set(character, this.overwriteContainerWithTracks(container, trackRecord));
		this.onRegistered.Fire(character, trackRecord);
		return this.registered;
	}

	private overwriteContainerWithTracks(
		container: AnimationTrackComponentRecord,
		tracks: AnimationTrackComponentRecord,
	): AnimationTrackComponentRecord {
		for (const [name, track] of pairs(tracks)) {
			if (name in container) {
				container[name].onDestroy();
				delete container[name];
			}
			container[name] = track;
		}
		return container;
	}

	private async initializeTracks(tracks: AnimationTrackComponentRecord): Promise<void> {
		for (const [, track] of pairs(tracks)) await track.initialize();
		for (const [name, track] of pairs(tracks))
			track
				.modifyFade(this.getFade(name))
				.modifyLoop(this.getLoop(name))
				.modifyPriority(this.getPriority(name))
				.modifyWeight(this.getWeight(name))
				.modifyLerpFade(this.getLerpFade(name))
				.modifySigmoidable(this.getSigmoidable(name));
	}

	private trackToComponent(tracks: AnimationTrackRecord): AnimationTrackComponentRecord {
		const componentsRecord = <AnimationTrackComponentRecord>{};
		for (const [name, track] of pairs(tracks))
			componentsRecord[name] = <TrackComponent>TrackComponent.create(track);

		return componentsRecord;
	}
}
