import { Controller, type OnRender, type OnStart } from "@flamework/core";
import type { LogStart, OnCharacterLoaded } from "shared/hooks";
import { CombatState, MiscState, MovementState, StateEvents } from "shared/enums/config-enum";
import type { CharacterController } from "./character";
import type { CameraController } from "./camera";
import { Tilter } from "client/components/character/tilter";
import { OnSignalSubscribed } from "shared/decorators";
import type { JournalController } from "./journal";
import { JournalHandler } from "shared/classes/journal-handler";

@Controller()
export class CFrameController extends JournalHandler implements OnStart, OnRender, LogStart, OnCharacterLoaded {
	// public charm!: StateType<boolean>;
	private tilter: Maybe<Tilter>;
	private lockedYaw: Maybe<number>;
	constructor(
		private readonly character: CharacterController,
		private readonly cameras: CameraController,
		readonly journal: JournalController,
	) {
		super(journal.util);
	}
	public onStart(): void {
		this.runMethods([
			{
				handleType: "blacklist",
				paths: [
					CombatState.FullStunned,
					CombatState.BlockBroken,
					CombatState.Exhausted,
					CombatState.NoRotate,
					CombatState.Knocked,
					CombatState.Exhausted,
					CombatState.Ragdoll,
					MiscState.Cutscene,
				],
				behavior: "Run If Single True",
			},
			{
				handleType: "whitelist",
				paths: [
					CombatState.Attacking,
					CombatState.Windup,
					CombatState.Recovery,
					MovementState.NoMove,
					CombatState.FullStunned,
					MiscState.Cutscene,
					CombatState.BlockBroken,
					CombatState.Exhausted,
					CombatState.Ragdoll,
					CombatState.Knocked,
					CombatState.Exhausted,
					CombatState.NoRotate,
				],
				behavior: "Run If Single True",
			},
		]);
	}

	public async onCharacterAdd(character: CharacterModel): Promise<void> {
		this.tilter = Tilter.create(character);
		this.journalUtil.write(MovementState.Shiftlocked, false);
		// this.tilter.enable();
	}

	public onRender(): void {
		const character = this.character.get();
		const root = this.character.getRoot();
		const humanoid = this.character.getHumanoid();
		const status = this.journalUtil.read<boolean>(MovementState.Shiftlocked);
		if (!character || !root || !humanoid || !this.tilter) return;
		if (this.isWhitelisted() || !status || humanoid.GetState() === Enum.HumanoidStateType.Dead) {
			if (this.tilter.enabled) this.tilter.disable();
		} else if (this.journalUtil.read<boolean>(MovementState.Shiftlocked) && !this.tilter.enabled)
			this.tilter.enable();

		if (!this.isBlacklisted() && this.lockedYaw) this.lockedYaw = undefined;

		if (status && !this.journalUtil.read<boolean>(MovementState.Sprint) && !this.isBlacklisted()) {
			this.setAutoRotate(humanoid, false);
			this.set(root, this.renderShiftlock(root));
		} else if (
			this.isBlacklisted() &&
			this.journalUtil.isPathValuesEqualTo(
				[CombatState.Knocked, CombatState.Ragdoll, CombatState.Exhausted],
				false,
			)
		) {
			if (!this.lockedYaw) {
				const [, y] = root.CFrame.ToOrientation();
				this.lockedYaw = y;
			}
			this.setAutoRotate(humanoid, false);
			this.set(root, new CFrame(root.Position).mul(CFrame.Angles(0, this.lockedYaw, 0)));
		} else {
			this.setAutoRotate(humanoid, true);
		}
	}

	@OnSignalSubscribed(StateEvents[MovementState.Shiftlocked])
	public onShiftlock() {
		this.journalUtil.write(MovementState.Shiftlocked, !this.journalUtil.read(MovementState.Shiftlocked));
	}

	private set(root: BasePart, cframe: CFrame) {
		root.CFrame = cframe;
	}

	private setAutoRotate(humanoid: Humanoid, value: boolean) {
		if (humanoid.AutoRotate !== value) humanoid.AutoRotate = value;
	}

	private renderShiftlock(root: BasePart): CFrame {
		const camera = this.cameras.get().instance;
		const [, y] = camera.CFrame.ToOrientation();
		return new CFrame(root.CFrame.Position).mul(CFrame.Angles(0, y, 0));
	}
}
