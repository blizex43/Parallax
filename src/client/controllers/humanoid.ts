import { FlameworkCharms, WalkspeedChanged } from "shared/constants";
import type { CharacterController } from "./character";
import { DeferTask, OnCharmSubscribed, OnSignalSubscribed } from "shared/decorators";
import { Controller, type OnStart } from "@flamework/core";
import type { WebsocketController } from "./state";
import { CombatState, MiscState, MovementState } from "shared/enums/config-enum";
import type { StateType } from "shared/structs/websocket";
import { Janitor } from "@rbxts/janitor";
import { OnCharacterAnimationsRegistered } from "shared/hooks";
import type { AnimationController } from "./animation";
import { HumanoidBaseWalkspeed, HumanoidMoveThreshhold, HumanoidStates } from "shared/enums/humanoid-enum";
import type { KeyboardController } from "./keyboard";
import type { AnimationTrackNames } from "shared/structs/animation";
import { CharmHandler } from "shared/classes/charm-handler";
import { SuperJanitor } from "shared/classes/super-janitor";
import { isMovingBackwards } from "shared/utility/basepart";
const { min } = math;
@Controller()
export class HumanoidController extends CharmHandler implements OnCharacterAnimationsRegistered, OnStart {
	public charm!: StateType;
	private shiftCharm: StateType<boolean>;
	private humanoidJanitor: Janitor = new Janitor();
	private sprintCharm: StateType<boolean>;
	constructor(
		private readonly character: CharacterController,
		private readonly animation: AnimationController,
		private readonly keyboard: KeyboardController,
		readonly ws: WebsocketController,
	) {
		super((...args) => ws.get(...args), MovementState.Sprint);
		this.shiftCharm = ws.get(MovementState.Shiftlocked);
		this.sprintCharm = ws.get(MovementState.Sprint);
	}
	public onStart(): void {
		this.giveCharmMethods({
			blacklist: {
				call: (...args) => this.ws.getBoardTrayTypeCallback(...args),
				names: [MovementState.Sprint, CombatState.Ragdoll, CombatState.Knocked, CombatState.Exhausted],
			},
			override: {
				call: (...args) => this.ws.getGroupSubscribedSignal(...args),
				names: [
					MovementState.Sprint,
					CombatState.Ragdoll,
					CombatState.Knocked,
					MovementState.NoMove,
					CombatState.Exhausted,
				],
				type: true,
			},
			whitelist: {
				call: (...args) => this.ws.getBoardTrayTypeCallback(...args),
				names: [MovementState.NoMove, CombatState.FullStunned, MiscState.Cutscene],
			},
		});
		this.keyboard.charm.changed.Connect(() => this.onSpeedChanged());
		this.initStates();
	}
	protected onOverride(): void {
		this.onSpeedChanged();
	}
	@OnCharmSubscribed(FlameworkCharms.CutsceneMode)
	public onCutsceneCharm(): void {
		const humanoid = this.character.getHumanoid();
		if (!humanoid) return;
	}
	@OnCharmSubscribed(FlameworkCharms.Shiftlocked)
	public onCharmShiftlock() {
		const humanoid = this.character.getHumanoid();
		if (!humanoid || this.sprintCharm.status) return;
	}
	@OnCharmSubscribed(FlameworkCharms.Sprint)
	public onCharmSprint(on: boolean) {
		const humanoid = this.character.getHumanoid();
		if (!humanoid || (!on && !this.shiftCharm.status)) return;
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
			this.keyboard.charm.status ? "style_idle" : "idle",
			this.keyboard.charm.status ? "style_walk" : "walk",
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
