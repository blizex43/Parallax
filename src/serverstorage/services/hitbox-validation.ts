import { OnSignalSubscribed } from "shared/decorators";
import { HttpService, Players, Workspace } from "@rbxts/services";
import { Service } from "@flamework/core";
import { Events } from "serverstorage/network";
import { LinkRemote } from "serverstorage/decorators";
import type { AttackContext, ClientHitboxWindow, HitWindow } from "shared/structs/attack";
import { HurtboxService } from "./hurtbox";
import { DamageRecieved } from "shared/constants";
import { CombatState } from "shared/enums/config-enum";
import { DefaultPingPrediction, PingPrediction } from "shared/enums/ping-prediction";
import { isBasePart, isCharacterModel } from "shared/utility/t-isA";
import { JournalService } from "./journal";

interface ActiveWindow {
	player: Player;
	character: CharacterModel;
	root: BasePart;
	startCFrame: CFrame;
	startAt: number;
	endAt: number;
	offset: CFrame;
	size: Vector3;
	window: HitWindow;
	context: AttackContext;
	onHit: (target: CharacterModel) => void;
	hit: boolean;
}

@Service()
export class HitboxValidationService {
	private readonly sessions = new Map<string, ActiveWindow>();

	public constructor(
		private readonly hurtboxes: HurtboxService,
		private readonly journal: JournalService,
	) {}

	public beginWindow(
		context: AttackContext,
		window: HitWindow,
		animationName: ClientHitboxWindow["animationName"],
		windup: number,
		duration: number,
		cooldown: number,
		animationSpeed: number,
		offset: CFrame,
		size: Vector3,
		onHit: (target: CharacterModel) => void,
	): void {
		const player = Players.GetPlayerFromCharacter(context.character);
		const root = context.character.HumanoidRootPart;
		if (!player || !root || !this.isValidWindow(windup, duration, offset, size, animationName)) return;

		const sessionId = HttpService.GenerateGUID(false);
		const startsAt = Workspace.GetServerTimeNow() + windup;
		const endsAt = startsAt + duration;
		const cooldownEndsAt = endsAt + cooldown;
		const session: ActiveWindow = {
			player,
			character: context.character,
			root,
			startCFrame: root.CFrame,
			startAt: startsAt,
			endAt: endsAt,
			offset,
			size,
			window,
			context,
			onHit,
			hit: false,
		};
		this.sessions.set(sessionId, session);
		Events.game.hitbox.begin.fire(
			player,
			sessionId,
			startsAt,
			endsAt,
			offset,
			size,
			animationName,
			context.packet.name,
			cooldownEndsAt,
			animationSpeed,
		);
		task.delay(windup + duration + 0.5, () => {
			if (this.sessions.get(sessionId) === session) this.sessions.delete(sessionId);
		});
	}

	@LinkRemote(Events.game.hitbox.report)
	public report(player: Player, sessionId: string, target: Model): void {
		const session = this.sessions.get(sessionId);
		if (!session || session.player !== player || session.hit) return;
		const now = Workspace.GetServerTimeNow();
		if (now < session.startAt || now > session.endAt + this.getPingLead(player)) return;
		if (player.Character !== session.character || !session.character.Parent) return this.cancelSession(sessionId);
		if (!this.hasActiveAttack(session, now) || !this.isFacingValid(session)) return this.cancelSession(sessionId);
		if (!isCharacterModel(target) || target === session.character || !target.IsDescendantOf(Workspace)) return;

		const humanoid = target.FindFirstChildOfClass("Humanoid");
		const targetRoot = target.FindFirstChild("HumanoidRootPart");
		const hurtbox = this.hurtboxes.getHurtbox(target);
		if (
			!humanoid ||
			humanoid.Health <= 0 ||
			!isBasePart(targetRoot) ||
			!hurtbox ||
			hurtbox.instance.Reference.Value !== target
		)
			return;
		if (!this.isInsideValidatedBox(session, targetRoot)) return;

		session.hit = true;
		this.sessions.delete(sessionId);
		Events.game.hitbox.finish.fire(player, sessionId);
		session.onHit(target);
	}

	@LinkRemote(Events.game.hitbox.cancel)
	public cancel(player: Player, sessionId: string): void {
		const session = this.sessions.get(sessionId);
		if (session?.player === player) this.cancelSession(sessionId);
	}

	public cancelCharacter(character: CharacterModel): void {
		for (const [sessionId, session] of this.sessions)
			if (session.character === character) this.cancelSession(sessionId);
	}

	@OnSignalSubscribed(Players.PlayerRemoving)
	public onPlayerRemoving(player: Player): void {
		for (const [sessionId, session] of this.sessions)
			if (session.player === player) this.sessions.delete(sessionId);
	}

	private isInsideValidatedBox(session: ActiveWindow, targetRoot: BasePart): boolean {
		const pingLead = this.getPingLead(session.player);
		const attackerPosition = session.startCFrame.Position.add(session.root.AssemblyLinearVelocity.mul(pingLead));
		const targetPosition = targetRoot.Position.add(targetRoot.AssemblyLinearVelocity.mul(pingLead));
		const box = new CFrame(attackerPosition).mul(session.startCFrame.Rotation).mul(session.offset);
		const localPosition = box.PointToObjectSpace(targetPosition);
		const tolerance = 0.35;
		return (
			math.abs(localPosition.X) <= session.size.X / 2 + tolerance &&
			math.abs(localPosition.Y) <= session.size.Y / 2 + tolerance &&
			math.abs(localPosition.Z) <= session.size.Z / 2 + tolerance
		);
	}

	private hasActiveAttack(session: ActiveWindow, now: number): boolean {
		if (session.context.character !== session.character) return false;
		if (this.journal.fetchStateValue<boolean>(session.character, CombatState.Attacking)) return true;
		return (
			DefaultPingPrediction === PingPrediction.Enabled && now <= session.endAt + this.getPingLead(session.player)
		);
	}

	private isFacingValid(session: ActiveWindow): boolean {
		return session.root.CFrame.LookVector.Dot(session.startCFrame.LookVector) >= 0.75;
	}

	private getPingLead(player: Player): number {
		let pingLead = 0;
		if (DefaultPingPrediction === PingPrediction.Enabled) pingLead = math.min(player.GetNetworkPing(), 0.25);
		return pingLead;
	}

	private isValidWindow(
		windup: number,
		duration: number,
		offset: CFrame,
		size: Vector3,
		animationName: string,
	): boolean {
		const isFiniteNumber = (value: number): boolean => value === value && math.abs(value) < math.huge;
		const dimensions = [size.X, size.Y, size.Z];
		const offsetPosition = offset.Position;
		return (
			isFiniteNumber(windup) &&
			isFiniteNumber(duration) &&
			windup >= 0 &&
			duration > 0 &&
			dimensions.every((dimension) => isFiniteNumber(dimension) && dimension > 0 && dimension <= 40) &&
			[offsetPosition.X, offsetPosition.Y, offsetPosition.Z].every(isFiniteNumber) &&
			animationName.size() > 0
		);
	}

	private cancelSession(sessionId: string): void {
		const session = this.sessions.get(sessionId);
		if (!session) return;
		this.sessions.delete(sessionId);
		Events.game.hitbox.finish.fire(session.player, sessionId);
	}
}
