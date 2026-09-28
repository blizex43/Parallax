import { Controller, OnStart } from "@flamework/core";
import { LogStart, OnCharacterAdd } from "shared/hooks";
import { CharacterController } from "./character";
import { atom } from "@rbxts/charm";
import Spring from "@rbxts/spring";
import { Janitor } from "@rbxts/janitor";
import { BaseJumpRefresh } from "shared/enums/jump-enum";
import { CombatState, MiscState, MovementState } from "shared/enums/config-enum";
import { JournalController } from "./journal";
import { JournalHandler } from "shared/classes/journal-handler";
@Controller()
export class JumpController extends JournalHandler implements OnStart, LogStart, OnCharacterAdd {
	// public charm!: StateType;
	private readonly janitor: Janitor = new Janitor();
	private readonly resetJanitor: Janitor = new Janitor();
	private jumpSpring!: Spring<number>;
	private jumpDisablePromise: Maybe<Promise<void>>;
	private baseJumpPower!: Charm.Atom<number>;
	constructor(
		private readonly character: CharacterController,
		readonly journal: JournalController,
	) {
		super(journal.util);
	}
	onStart(): void {
		this.runMethods([
			{
				handleType: "blacklist",
				paths: [
					CombatState.Stunned,
					CombatState.FullStunned,
					CombatState.BlockBroken,
					CombatState.Block,
					CombatState.Ragdoll,
					CombatState.Exhausted,
					MovementState.NoMove,
					MovementState.Dash,
					CombatState.Windup,
					CombatState.Attacking,
					CombatState.Recovery,
					CombatState.CombatEquip,
					MiscState.Cutscene,
				],
				behavior: "Run If Single True",
			},

			{
				handleType: "override",
				paths: [
					CombatState.Stunned,
					CombatState.FullStunned,
					CombatState.BlockBroken,
					CombatState.Block,
					CombatState.Ragdoll,
					CombatState.Exhausted,
					MovementState.NoMove,
					MovementState.Dash,
					CombatState.Windup,
					CombatState.Attacking,
					CombatState.Recovery,
					CombatState.CombatEquip,
					MiscState.Cutscene,
				],
				behavior: "Run If Single True",
			},

			{
				handleType: "override",
				paths: [
					CombatState.Stunned,
					CombatState.FullStunned,
					CombatState.BlockBroken,
					CombatState.Block,
					CombatState.Ragdoll,
					CombatState.Exhausted,
					MovementState.NoMove,
					MovementState.Dash,
					CombatState.Windup,
					CombatState.Attacking,
					CombatState.Recovery,
					CombatState.CombatEquip,
					MiscState.Cutscene,
				],
				behavior: "Run If All False",
			},
		]);
	}

	protected onOverride(on: boolean): void {
		const humanoid = this.character.getHumanoid();
		if (!humanoid) return;
		if (on) {
			this.journalUtil.write(MovementState.Jump, false);
			this.disableJump(humanoid);
		} else {
			this.journalUtil.write(MovementState.Jump, true);
			this.enableJump(humanoid);
		}
	}

	public onCharacterAdd(): void {
		this.janitor.Cleanup();
		this.janitor.AddPromise(
			this.character.mustGetHumanoid().then((humanoid) => {
				this.giveHumanoidProperties(humanoid);
				if (!this.baseJumpPower) {
					this.baseJumpPower = atom(humanoid.JumpPower);
					this.jumpSpring = new Spring(this.baseJumpPower(), undefined, 0);
				}
				this.janitor.Add(
					humanoid.StateChanged.Connect(
						(oldState) => oldState === Enum.HumanoidStateType.Jumping && this.onHumanoidJump(humanoid),
					),
				);
			}),
		);
	}

	public onHumanoidJump(humanoid: Humanoid) {
		this.update(humanoid);
		this.resetJanitor.Cleanup();
		this.resetJanitor.Add(
			task.delay(BaseJumpRefresh, () => {
				this.jumpSpring.resetToPosition(this.baseJumpPower());
				humanoid.JumpPower = this.jumpSpring.position;
				this.enableJump(humanoid);
			}),
		);
	}

	public giveHumanoidProperties(humanoid: Humanoid) {
		humanoid.UseJumpPower = true;
	}

	public update(humanoid: Humanoid) {
		this.jumpSpring.update(0.004);
		const jump = this.jumpSpring.position;
		if (jump < 10) this.jumpDisablePromise = this.disableJump(humanoid);
		humanoid.JumpPower = jump;
	}

	public async disableJump(humanoid: Humanoid, amount?: number): Promise<void> {
		return new Promise((resolve) => {
			humanoid.SetStateEnabled("Jumping", false);
			if (!amount) return resolve();
			task.wait(amount);
			humanoid.SetStateEnabled("Jumping", true);
			resolve();
		});
	}

	public async enableJump(humanoid: Maybe<Humanoid>): Promise<void> {
		if (!this.journalUtil.read(MovementState.Jump)) return;
		humanoid = humanoid ? humanoid : await this.character.getHumanoid();
		if (!humanoid) return;
		if (this.jumpDisablePromise && this.jumpDisablePromise.getStatus() !== "Resolved")
			this.jumpDisablePromise.cancel();
		humanoid.SetStateEnabled("Jumping", true);
	}

	public isAirborne(humanoid: Humanoid): boolean {
		return humanoid.FloorMaterial === Enum.Material.Air;
	}
}
