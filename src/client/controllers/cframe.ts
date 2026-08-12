import { Controller, type OnRender, type OnStart } from "@flamework/core";
import type { LogStart, OnCharacterLoaded } from "shared/hooks";
import { CombatState, MiscState, MovementState, StateEvents } from "shared/enums/config-enum";
import type { CharacterController } from "./character";
import type { CameraController } from "./camera";
import type { StateType } from "shared/structs/websocket";
import { CharmHandler } from "shared/classes/charm-handler";
import type { SprintController } from "./sprint";
import { Tilter } from "client/components/character/tilter";
import type { WebsocketManagementController } from "./websocket-manager";
import type { WebsocketController } from "./state";
import { OnSignalSubscribed } from "shared/decorators";

@Controller()
export class CFrameController extends CharmHandler<boolean> implements OnStart, OnRender, LogStart, OnCharacterLoaded {
	public charm!: StateType<boolean>;
	private tilter: Maybe<Tilter>;
	private lockedYaw: Maybe<number>;
	constructor(
		private readonly character: CharacterController,
		private readonly movement: SprintController,
		private readonly cameras: CameraController,
		private readonly wsm: WebsocketManagementController,
		private readonly ws: WebsocketController,
	) {
		super((...args) => ws.get(...args), MovementState.Shiftlocked);
	}
	public onStart(): void {
		this.giveCharmMethods({
			// NonShiftlock CFrame
			blacklist: {
				call: (...args) => this.ws.getBoardTrayTypeCallback(...args),
				names: [
					CombatState.FullStunned,
					CombatState.BlockBroken,
					CombatState.Exhausted,
					CombatState.NoRotate,
					CombatState.Knocked,
					CombatState.Exhausted,
					CombatState.Ragdoll,
					MiscState.Cutscene,
				],
			},
			// NonTiltable
			whitelist: {
				call: (...args) => this.ws.getBoardTrayTypeCallback(...args),
				names: [
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
			},
		});
	}

	public async onCharacterAdd(character: CharacterModel): Promise<void> {
		this.tilter = Tilter.create(character);
		this.wsm.setState(MovementState.Shiftlocked, false);
		// this.tilter.enable();
	}

	public onRender(): void {
		const character = this.character.get();
		const root = this.character.getRoot();
		const humanoid = this.character.getHumanoid();
		if (!character || !root || !humanoid || !this.tilter) return;
		if (
			(this.isWhitelisted() || !this.charm.status || humanoid.GetState() === Enum.HumanoidStateType.Dead) &&
			this.tilter.enabled
		)
			this.tilter.disable();
		else if (this.charm.status && !this.tilter.enabled) this.tilter.enable();

		if (!this.isBlacklisted() && this.lockedYaw) this.lockedYaw = undefined;

		if (this.charm.status && !this.movement.charm.status && !this.isBlacklisted()) {
			this.setAutoRotate(humanoid, false);
			this.set(root, this.renderShiftlock(root));
		} else if (
			this.isBlacklisted() &&
			this.wsm.isStatesEqualTo([CombatState.Knocked, CombatState.Ragdoll, CombatState.Exhausted], false)
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
		this.wsm.setState(MovementState.Shiftlocked, !this.charm.status);
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
