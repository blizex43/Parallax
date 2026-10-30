import { WalkspeedChanged } from "shared/constants";
import type { CharacterController } from "./character";
import { DeferTask, OnSignalSubscribed } from "shared/decorators";
import { Controller, type OnRender, type OnStart } from "@flamework/core";
import { CombatState, MiscState, MovementState } from "shared/enums/config-enum";
import { Janitor } from "@rbxts/janitor";
import { OnCharacterAnimationsRegistered } from "shared/hooks";
import type { AnimationController } from "./animation";
import { HumanoidBaseWalkspeed, HumanoidMoveThreshhold, HumanoidStates } from "shared/enums/humanoid-enum";
import type { AnimationTrackNames } from "shared/structs/animation";
import { SuperJanitor } from "shared/classes/super-janitor";
import { JournalHandler } from "shared/classes/journal-handler";
import type { JournalController } from "./journal";
import { OnJournalEntrySubscribed } from "client/decorators";
const { min } = math;
@Controller()
export class HumanoidController extends JournalHandler implements OnCharacterAnimationsRegistered, OnStart, OnRender {
	private humanoidJanitor: Janitor = new Janitor();
	constructor(
		private readonly character: CharacterController,
		private readonly animation: AnimationController,
		readonly journal: JournalController,
	) {
		super(journal.util);
	}
	public onStart(): void {
		this.runMethods([
			{
				handleType: "blacklist",
				paths: [CombatState.Ragdoll, CombatState.Knocked, CombatState.Exhausted],
				behavior: "Run If Single True",
			},
			{
				handleType: "override",
				paths: [
					MovementState.Sprint,
					CombatState.Ragdoll,
					CombatState.Knocked,
					MovementState.NoMove,
					CombatState.Exhausted,
				],
				behavior: "Run If Single True",
			},
			{
				handleType: "whitelist",
				paths: [MovementState.NoMove, CombatState.FullStunned, MiscState.Cutscene],
				behavior: "Run If Single True",
			},
		]);
		this.journalUtil.getPathChanged(CombatState.CombatEquip).Connect(() => this.onSpeedChanged());
		this.initStates();
	}
	public onRender(): void {
		this.onSpeedChanged();
	}
	protected onOverride(): void {
		this.onSpeedChanged();
	}
	@OnJournalEntrySubscribed(MiscState.Cutscene)
	public onCutsceneCharm(): void {
		const humanoid = this.character.getHumanoid();
		if (!humanoid) return;
	}
	@OnJournalEntrySubscribed(MovementState.Shiftlocked)
	public onCharmShiftlock() {
		const humanoid = this.character.getHumanoid();
		if (!humanoid || this.journalUtil.read<boolean>(MovementState.Shiftlocked)) return;
	}
	@OnJournalEntrySubscribed(MovementState.Sprint)
	public onCharmSprint(on: boolean) {
		const humanoid = this.character.getHumanoid();
		if (!humanoid || (!on && !this.journalUtil.read<boolean>(MovementState.Shiftlocked))) return;
	}

	public setStateEnabled(state: Enum.HumanoidStateType, enable: boolean): void {
		const humanoid = this.character.getHumanoid();
		if (!humanoid) return;
		humanoid.SetStateEnabled(state, enable);
	}

	public setStateEnabledFor(state: Enum.HumanoidStateType, enable: boolean, duration: number): void {
		SuperJanitor.del(`humanoid_state_changer`);
		this.setStateEnabled(state, enable);
		SuperJanitor.set(`humanoid_state_changer`, () => this.setStateEnabled(state, enable), duration);
	}

	@OnSignalSubscribed(WalkspeedChanged)
	public adjustWalkSpeed() {
		const character = this.character.get();
		const humanoid = this.character.getHumanoid();
		if (!character || !humanoid) return;
		const speedMul = humanoid.WalkSpeed / HumanoidBaseWalkspeed;
		this.adjust(character, speedMul);
	}

	private adjust(character: CharacterModel, speed: number, name: AnimationTrackNames = "walk") {
		this.animation.adjustSpeed(character, name, speed);
	}

	@OnSignalSubscribed(WalkspeedChanged)
	public onSpeedChanged() {
		const character = this.character.get();
		const humanoid = this.character.getHumanoid();
		const root = this.character.getRoot();
		if (!character || !humanoid || !root || this.isBlacklisted()) return;
		const styleEquipped = this.journalUtil.read<boolean>(CombatState.CombatEquip) ?? false;
		const preferredIdle: AnimationTrackNames = styleEquipped ? "style_idle" : "idle";
		const idleName = this.animation.getTrack(character, preferredIdle)
			? preferredIdle
			: styleEquipped
				? "idle"
				: preferredIdle;
		const useStyleWalk = styleEquipped && this.animation.getTrack(character, "style_walk") !== undefined;
		const walkName = this.getDirectionalWalk(
			character,
			root,
			humanoid,
			useStyleWalk,
			useStyleWalk ? "style_walk" : "walk",
		);
		const moving = humanoid.MoveDirection.Magnitude > HumanoidMoveThreshhold;
		const isSprinting =
			moving &&
			this.journalUtil.read<boolean>(MovementState.Sprint) === true &&
			this.animation.getTrack(character, "sprint") !== undefined;
		const locomotionName = isSprinting ? "sprint" : walkName;
		const speedMul = min(1.2, humanoid.WalkSpeed / HumanoidBaseWalkspeed);
		if (moving && !this.animation.isPlaying(character, locomotionName) && !this.isWhitelisted())
			this.animation.playAnim(character, locomotionName, true, { speed: speedMul });
		else if (
			(!moving || this.isWhitelisted()) &&
			(!this.animation.isPlaying(character, idleName) || this.animation.isPlaying(character, locomotionName))
		)
			this.animation.playAnim(character, idleName);
		this.adjust(character, speedMul, locomotionName);
	}
	private getDirectionalWalk(
		character: CharacterModel,
		root: BasePart,
		humanoid: Humanoid,
		styleEquipped: boolean,
		defaultName: AnimationTrackNames,
	): AnimationTrackNames {
		const localDirection = root.CFrame.VectorToObjectSpace(humanoid.MoveDirection);
		let directionalName: AnimationTrackNames;
		if (math.abs(localDirection.X) > math.abs(localDirection.Z))
			directionalName = styleEquipped
				? localDirection.X > 0
					? "style_walkright"
					: "style_walkleft"
				: localDirection.X > 0
					? "walkright"
					: "walkleft";
		else if (localDirection.Z > 0) directionalName = styleEquipped ? "style_walkback" : "walkback";
		else return defaultName;

		return this.animation.getTrack(character, directionalName) ? directionalName : defaultName;
	}
	@DeferTask()
	public onCharacterAnimationsRegistered(character: CharacterModel): void {
		if (character !== this.character.get()) return;
		this.humanoidJanitor.Cleanup();
		this.humanoidJanitor.AddPromise(
			this.character.mustGetHumanoid().then((humanoid) => {
				this.onSpeedChanged();
				this.humanoidJanitor.Add(
					humanoid.GetPropertyChangedSignal("MoveDirection").Connect(() => this.onSpeedChanged()),
				);
				this.humanoidJanitor.Add(humanoid.StateChanged.Connect(() => this.onSpeedChanged()));
			}),
		);
	}

	public async initStates(): Promise<void> {
		const humanoid = await this.character.mustGetHumanoid();
		for (const [name, value] of pairs(HumanoidStates)) humanoid.SetStateEnabled(name, value);
	}
}
