import { Controller, type OnStart } from "@flamework/core";
import { Workspace } from "@rbxts/services";
import type { AnimationController } from "./animation";
import { isCharacterModel, isNumber, isString } from "shared/utility/t-isA";

interface WatchedNPC {
	readonly animationChanged: RBXScriptConnection;
	readonly attackEnded: RBXScriptConnection[];
}

@Controller()
export class NpcAnimationController implements OnStart {
	private readonly watched = new Map<CharacterModel, WatchedNPC>();

	public constructor(private readonly animation: AnimationController) {}

	public onStart(): void {
		for (const descendant of Workspace.GetDescendants()) this.watch(descendant);
		Workspace.DescendantAdded.Connect((descendant) => this.watch(descendant));
		Workspace.DescendantRemoving.Connect((descendant) => this.unwatch(descendant));
	}

	private watch(instance: Instance): void {
		if (!isCharacterModel(instance) || this.watched.has(instance)) return;
		if (!isString(instance.GetAttribute("NPCAnimation"))) return;

		const state: WatchedNPC = {
			animationChanged: instance
				.GetAttributeChangedSignal("NPCAnimation")
				.Connect(() => this.playDesired(instance)),
			attackEnded: [],
		};
		this.watched.set(instance, state);
		task.spawn(async () => {
			await this.animation.onCharacterAdd(instance);
			this.connectAttackTracks(instance, state);
			this.playDesired(instance);
		});
	}

	private connectAttackTracks(character: CharacterModel, state: WatchedNPC): void {
		for (const name of this.animation.getRuntimeTrackNames(character) ?? []) {
			if (!this.isAttackAnimation(name)) continue;
			const track = this.animation.getTrackByName(character, name);
			if (track) state.attackEnded.push(track.ended.Connect(() => task.defer(() => this.playDesired(character))));
		}
	}

	private playDesired(character: CharacterModel): void {
		const name = character.GetAttribute("NPCAnimation");
		if (!isString(name)) return;
		const trackNames = this.animation.getRuntimeTrackNames(character) ?? [];
		const attackPlaying = trackNames.some(
			(trackName) =>
				this.isAttackAnimation(trackName) && this.animation.getTrackByName(character, trackName)?.playing(),
		);
		if (attackPlaying) return;

		const speed = character.GetAttribute("NPCAnimationSpeed");
		const track = this.animation.getTrackByName(character, name);
		if (!track) {
			task.spawn(async () => {
				if (await this.animation.ensureTrack(character, name)) this.playDesired(character);
			});
			return;
		}
		if (track.playing()) {
			track.modifySpeed(isNumber(speed) ? speed : 1);
			return;
		}
		this.animation.playAnimByName(character, name, true, { speed: isNumber(speed) ? speed : 1 });
	}

	private isAttackAnimation(name: string): boolean {
		const suffix = name.sub(name.size() - 5);
		return (
			suffix === ":heavy" ||
			suffix === "light1" ||
			suffix === "light2" ||
			suffix === "light3" ||
			suffix === "light4" ||
			suffix === "light5"
		);
	}

	private unwatch(instance: Instance): void {
		if (!isCharacterModel(instance)) return;
		const state = this.watched.get(instance);
		if (!state) return;
		this.watched.delete(instance);
		state.animationChanged.Disconnect();
		for (const connection of state.attackEnded) connection.Disconnect();
		this.animation.onCharacterRemove(instance);
	}
}
