import { WalkspeedChanged } from "shared/constants";
import type { CharacterController } from "./character";
import { DeferTask, OnSignalSubscribed } from "shared/decorators";
import { Controller, type OnStart } from "@flamework/core";
import { CombatState, MiscState, MovementState } from "shared/enums/config-enum";
import { Janitor } from "@rbxts/janitor";
import { OnCharacterAnimationsRegistered } from "shared/hooks";
import type { AnimationController } from "./animation";
import { HumanoidBaseWalkspeed, HumanoidMoveThreshhold, HumanoidStates } from "shared/enums/humanoid-enum";
import type { AnimationTrackNames } from "shared/structs/animation";
import { SuperJanitor } from "shared/classes/super-janitor";
import { isMovingBackwards } from "shared/utility/basepart";
import { JournalHandler } from "shared/classes/journal-handler";
import type { JournalController } from "./journal";
import { OnJournalEntrySubscribed } from "client/decorators";
const { min } = math;
@Controller()
export class HumanoidController extends JournalHandler implements OnCharacterAnimationsRegistered, OnStart {
	// public charm!: StateType;
	// private shiftCharm: StateType<boolean>;
	private humanoidJanitor: Janitor = new Janitor();
	// private sprintCharm: StateType<boolean>;
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
		const [idleName, walkName] = <[AnimationTrackNames, AnimationTrackNames]>[
			this.journalUtil.read<boolean>(CombatState.CombatEquip) ? "style_idle" : "idle",
			this.journalUtil.read<boolean>(CombatState.CombatEquip) ? "style_walk" : "walk",
		];
		const moving = humanoid.MoveDirection.Magnitude > HumanoidMoveThreshhold;
		let speedMul = min(1.2, humanoid.WalkSpeed / HumanoidBaseWalkspeed);
		if (isMovingBackwards(root, humanoid)) speedMul = -speedMul;
		if (moving && !this.animation.isPlaying(character, walkName) && !this.isWhitelisted())
			this.animation.playAnim(character, walkName, true, { speed: speedMul });
		else if (
			(!moving || this.isWhitelisted()) &&
			(!this.animation.isPlaying(character, idleName) || this.animation.isPlaying(character, walkName))
		)
			this.animation.playAnim(character, idleName);
		this.adjust(character, speedMul, walkName);
	}
	@DeferTask()
	public onCharacterAnimationsRegistered(character: CharacterModel): void {
		this.humanoidJanitor.Cleanup();
		this.humanoidJanitor.AddPromise(
			this.character.mustGetHumanoid().then((humanoid) => {
				this.animation.playAnim(character, "idle");
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
