import type { OnCharacterLoaded, OnCharacterRemove } from "shared/hooks";
import type { CharacterController } from "./character";
import { Controller, type OnStart } from "@flamework/core";
import { LinkSerializedRemote } from "client/decorators";
import { Events } from "client/network";
import { Serializers } from "shared/network";
import type { PushDirection } from "shared/structs/push";
import { Cooldown, OnSignalSubscribed } from "shared/decorators";
import type { AnimationController } from "./animation";
import { CombatState, MiscState, MovementState, StateEvents } from "shared/enums/config-enum";
import type { PushPacket } from "shared/structs/packets";
import { Mover } from "shared/components/mover";
import type { MoverNames } from "shared/structs/mover";
import { DashProperties, DefaultDashProperties, HardDashDebounce } from "shared/enums/push-enum";
import type { ScalingController } from "./scaling";
import type { JumpController } from "./jump";
import { JournalHandler } from "shared/classes/journal-handler";
import { JournalController } from "./journal";

@Controller()
export class PushController extends JournalHandler implements OnCharacterLoaded, OnStart, OnCharacterRemove {
	// public charm!: StateType<boolean>;
	private movers = <Record<MoverNames, Mover>>{};
	protected onOverride = undefined;
	constructor(
		private readonly character: CharacterController,
		private readonly animation: AnimationController,
		private readonly scaling: ScalingController,
		private readonly jump: JumpController,
		private readonly journal: JournalController,
	) {
		super(journal.util);
	}

	public onStart(): void {
		this.runMethods([
			{
				handleType: "blacklist",
				paths: [
					MovementState.Dash,
					CombatState.Stunned,
					CombatState.FullStunned,
					CombatState.BlockBroken,
					CombatState.Block,
					CombatState.Exhausted,
					CombatState.Ragdoll,
					CombatState.Knocked,
					CombatState.Exhausted,
					CombatState.Windup,
					CombatState.Recovery,
					CombatState.Attacking,
					MovementState.NoMove,
					MiscState.Cutscene,
				],
				behavior: "Run If Single True",
			},
		]);
	}

	public onCharacterAdd(character: CharacterModel): void {
		this.movers.default = Mover.create(character);
		this.movers.global = Mover.create(character);
	}

	public onCharacterRemove(): void {
		for (const [, mover] of pairs(this.movers)) mover.onDestroy();
	}

	@OnSignalSubscribed(StateEvents[MovementState.Dash])
	public onDash(): void {
		const character = this.character.get();
		if (!character || this.isBlacklisted() || this.jump.isAirborne(character.Humanoid)) return;
		return this.dash(character);
	}

	@LinkSerializedRemote(Events.push.run, Serializers.push)
	private async set(packet: PushPacket = {}, name: MoverNames = "global", play: boolean = true): Promise<void> {
		if (packet) this.movers[name].set(packet);
		if (play) this.movers[name].playExtern(packet.useVector ?? false);
	}

	@Cooldown(HardDashDebounce)
	private dash(character: CharacterModel): void {
		const direction = this.getMoveDirToType(character.HumanoidRootPart, character.Humanoid);
		const duration = this.getDashDuration();
		const power = this.getDashPower();
		const unturnable = false;
		if (!this.canDash(direction)) return;
		this.setDashCD(direction, this.getDashCooldown());
		this.set({ direction, duration, power, unturnable }, "default");
		this.animation.playAnim(character, <"frontdash">(direction.lower() + "dash"), false);
		this.notifyServer();
	}

	private notifyServer(): void {
		return Events.game.dash.fire(
			Serializers.dash.serialize({
				on: true,
			}),
		);
	}

	private canDash(direction: PushDirection): boolean {
		const horizontal = direction === "Left" || direction === "Right";
		if (horizontal) return !this.journalUtil.read<boolean>(MovementState.DashHorizontal);
		return !this.journalUtil.read<boolean>(MovementState.DashVertical);
	}

	private setDashCD(direction: PushDirection, cooldown: number): void {
		switch (direction) {
			case "Right":
			case "Left":
				this.journalUtil.writeFor(MovementState.DashHorizontal, true, cooldown, false, true);
				break;
			case "Back":
			case "Front":
				this.journalUtil.writeFor(MovementState.DashVertical, true, cooldown, false, true);
				break;
		}
		this.journalUtil.writeFor(MovementState.Dash, true, cooldown / 2, false, true);
	}

	private getDashCooldown(): number {
		return DashProperties.Cooldown;
	}

	private getDashDuration(): number {
		return this.scaling.getDash(DefaultDashProperties.duration, "dashdistance");
	}

	private getDashPower(): number {
		return this.scaling.getDash(DefaultDashProperties.power, "dashpower");
	}

	private getMoveDirToType(root: RootPart, humanoid: Humanoid): PushDirection {
		const move = humanoid.MoveDirection;
		if (move.Magnitude < 0.1) return "Back";
		const unit = move.Unit;
		const [frontDot, rightDot] = [unit.Dot(root.CFrame.LookVector), unit.Dot(root.CFrame.RightVector)];
		const zType = math.abs(frontDot) >= math.abs(rightDot);
		return zType && frontDot > 0 ? "Front" : !zType && rightDot > 0 ? "Right" : !zType ? "Left" : "Back";
	}
}
