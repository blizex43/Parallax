import Object from "@rbxts/object-utils";
import Signal from "@rbxts/signal";
import { $warn } from "rbxts-transform-debug";
import { TrackComponent } from "shared/components/track";
import { animationOverrides, OVERRIDES_TEMPLATE } from "shared/enums/animation-enum";
import type {
	AnimationOffsets,
	AnimationTrackComponentRecord,
	AnimationTrackNames,
	RuntimeAnimationTrackComponentRecord,
	RuntimeAnimationTrackRecord,
} from "shared/structs/animation";

export abstract class TrackHandler {
	public readonly initiatedPlayers: Player[] = [];
	private readonly registered: Map<CharacterModel, RuntimeAnimationTrackComponentRecord> = new Map();
	public readonly onRegistered: Signal<
		(character: CharacterModel, tracks: RuntimeAnimationTrackComponentRecord) => void
	> = new Signal();
	public readonly onDeregistered: Signal<(character: CharacterModel) => void> = new Signal();
	protected async registerCharacter(
		character: CharacterModel,
		tracks: RuntimeAnimationTrackRecord,
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

	public playAnimByName(
		character: CharacterModel,
		animName: string,
		stopOthers: boolean = true,
		offsets: AnimationOffsets = { speed: 1, fade: 1 },
	): void {
		const tracks = this.getTracks(character);
		const track = tracks?.[animName];
		if (!tracks || !track) return;
		if (stopOthers) this.stopOtherRuntimeTracks(tracks, animName);
		track
			.modifyFade(this.getFade(animName) * (offsets.fade ?? 1))
			.modifySpeed(offsets.speed ?? 1)
			.play();
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
		return <AnimationTrackNames[]>this.getRuntimeTrackNames(character);
	}

	public getRuntimeTrackNames(character: CharacterModel): Maybe<string[]> {
		return <string[]>Object.keys(this.getTracks(character) ?? {});
	}

	public getTracks(character: CharacterModel): Maybe<RuntimeAnimationTrackComponentRecord> {
		return this.registered.get(character);
	}

	public getTrack(character: CharacterModel, name: AnimationTrackNames): Maybe<TrackComponent> {
		const track = this.registered.get(character)?.[name];
		if (!track || track.length() === 0) return;
		return track;
	}

	public getTrackByName(character: CharacterModel, name: string): Maybe<TrackComponent> {
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

	private stopOtherRuntimeTracks(tracks: RuntimeAnimationTrackComponentRecord, animName: string): void {
		for (const [name, track] of pairs(tracks)) {
			if (name !== animName && track.playing()) track.stop();
		}
	}

	private getOverrideName(animName: string): AnimationTrackNames {
		if (animName.sub(animName.size() - 4) === ":idle") return "style_idle";
		if (animName.sub(animName.size() - 4) === ":walk") return "style_walk";
		return <AnimationTrackNames>animName;
	}

	private getGrade(animName: AnimationTrackNames | string): number {
		return animationOverrides[this.getOverrideName(animName)]?.grade ?? OVERRIDES_TEMPLATE.grade;
	}

	private getSigmoidable(animName: AnimationTrackNames | string): boolean {
		return animationOverrides[this.getOverrideName(animName)]?.acceptsSigmoid ?? OVERRIDES_TEMPLATE.acceptsSigmoid;
	}

	private getAutoStoppable(animName: AnimationTrackNames | string): boolean {
		return animationOverrides[this.getOverrideName(animName)]?.autoStoppable ?? OVERRIDES_TEMPLATE.autoStoppable;
	}

	private getSpeed(animName: AnimationTrackNames | string): number {
		return animationOverrides[this.getOverrideName(animName)]?.speed ?? OVERRIDES_TEMPLATE.speed;
	}

	private getWeight(animName: AnimationTrackNames | string): number {
		return animationOverrides[this.getOverrideName(animName)]?.weight ?? OVERRIDES_TEMPLATE.weight;
	}

	private getFade(animName: AnimationTrackNames | string): number {
		return animationOverrides[this.getOverrideName(animName)]?.fade ?? OVERRIDES_TEMPLATE.fade;
	}

	private getLerpFade(animName: AnimationTrackNames | string): number {
		return animationOverrides[this.getOverrideName(animName)]?.lerpFade ?? OVERRIDES_TEMPLATE.lerpFade;
	}

	private getLoop(animName: AnimationTrackNames | string): boolean {
		return animationOverrides[this.getOverrideName(animName)]?.loop ?? OVERRIDES_TEMPLATE.loop;
	}

	private getPriority(animName: AnimationTrackNames | string): Enum.AnimationPriority {
		return animationOverrides[this.getOverrideName(animName)]?.priority ?? OVERRIDES_TEMPLATE.priority;
	}

	private async deregister(
		character: CharacterModel,
		destroy: boolean,
	): Promise<Map<CharacterModel, RuntimeAnimationTrackComponentRecord>> {
		if (destroy) this.destroyTracks(this.getTracks(character));
		this.registered.delete(character);
		this.onDeregistered.Fire(character);
		return this.registered;
	}

	private destroyTracks(tracks: Maybe<RuntimeAnimationTrackComponentRecord>): void {
		if (!tracks) return;
		for (const track of Object.values(tracks)) track.onDestroy();
	}

	private async register(
		character: CharacterModel,
		tracks: RuntimeAnimationTrackRecord,
	): Promise<typeof this.registered> {
		const trackRecord = this.trackToComponent(tracks);
		await this.initializeTracks(trackRecord);
		const container = <RuntimeAnimationTrackComponentRecord>this.getTracks(character) ?? {};
		this.registered.set(character, this.overwriteContainerWithTracks(container, trackRecord));
		this.onRegistered.Fire(character, trackRecord);
		return this.registered;
	}

	private overwriteContainerWithTracks(
		container: RuntimeAnimationTrackComponentRecord,
		tracks: RuntimeAnimationTrackComponentRecord,
	): RuntimeAnimationTrackComponentRecord {
		for (const [name, track] of pairs(tracks)) {
			if (name in container) {
				container[name].onDestroy();
				delete container[name];
			}
			container[name] = track;
		}
		return container;
	}

	private async initializeTracks(tracks: RuntimeAnimationTrackComponentRecord): Promise<void> {
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

	private trackToComponent(tracks: RuntimeAnimationTrackRecord): RuntimeAnimationTrackComponentRecord {
		const componentsRecord = <RuntimeAnimationTrackComponentRecord>{};
		for (const [name, track] of pairs(tracks))
			componentsRecord[name] = <TrackComponent>TrackComponent.create(track);

		return componentsRecord;
	}
}
