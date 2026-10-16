import { Controller, type OnStart } from "@flamework/core";
import { Players, RunService, Workspace } from "@rbxts/services";
import { Events } from "client/network";
import type { AnimationController } from "./animation";
import type { ClientHitboxWindow } from "shared/structs/attack";
import { isBasePart, isCharacterModel } from "shared/utility/t-isA";
import { MiscState } from "shared/enums/config-enum";
import { JournalHandler } from "shared/classes/journal-handler";
import type { JournalController } from "./journal";
import type { MeleeController } from "./melee";

interface ActiveWindow {
	packet: ClientHitboxWindow;
	character: CharacterModel;
	root: BasePart;
	startLook: Vector3;
	part: Part;
}

@Controller()
export class HitboxController extends JournalHandler implements OnStart {
	private readonly windows = new Map<string, ActiveWindow>();
	private readonly overlap = new OverlapParams();
	private debugEnabled = false;

	public constructor(
		private readonly animation: AnimationController,
		private readonly melee: MeleeController,
		journal: JournalController,
	) {
		super(journal.util);
	}

	public onStart(): void {
		this.overlap.FilterType = Enum.RaycastFilterType.Include;
		this.debugEnabled = this.journalUtil.read<boolean>(MiscState.Debug) ?? false;
		this.journalUtil
			.getPathChanged<boolean>(MiscState.Debug)
			.Connect((value) => this.setDebugEnabled(value.newValue));
		Events.game.hitbox.begin.connect(
			(sessionId, startsAt, endsAt, offset, size, animationName, attackName, cooldownEndsAt, animationSpeed) =>
				this.begin({
					sessionId,
					startsAt,
					endsAt,
					offset,
					size,
					animationName,
					attackName,
					cooldownEndsAt,
					animationSpeed,
				}),
		);
		Events.game.hitbox.finish.connect((sessionId) => this.finish(sessionId));
		RunService.RenderStepped.Connect(() => this.update());
		Players.LocalPlayer.CharacterRemoving.Connect(() => this.finishAll(true));
	}

	private begin(packet: ClientHitboxWindow): void {
		this.finish(packet.sessionId);
		this.melee.applyServerCooldown(packet.attackName, packet.cooldownEndsAt);
		const character = Players.LocalPlayer.Character;
		const root = character?.FindFirstChild("HumanoidRootPart");
		if (!character || !isCharacterModel(character) || !isBasePart(root)) {
			Events.game.hitbox.cancel(packet.sessionId);
			return;
		}

		if (
			!this.isValidWindow(packet) ||
			!this.playAttackAnimation(character, packet.animationName, packet.animationSpeed)
		) {
			Events.game.hitbox.cancel(packet.sessionId);
			return;
		}

		const part = this.createHitboxPart(character, root, packet);
		this.windows.set(packet.sessionId, {
			packet,
			character,
			root,
			startLook: root.CFrame.LookVector,
			part,
		});
	}

	private createHitboxPart(character: CharacterModel, root: BasePart, packet: ClientHitboxWindow): Part {
		const part = new Instance("Part");
		part.Name = "ClientAttackHitbox";
		part.Size = packet.size;
		part.Transparency = this.debugEnabled ? 0.45 : 1;
		part.Color = Color3.fromRGB(255, 70, 70);
		part.Material = Enum.Material.Neon;
		part.Anchored = false;
		part.Massless = true;
		part.CanCollide = false;
		part.CanTouch = false;
		part.CanQuery = false;
		part.CFrame = root.CFrame.mul(packet.offset);
		part.Parent = character;
		const weld = new Instance("Weld");
		weld.Part0 = root;
		weld.Part1 = part;
		weld.C0 = packet.offset;
		weld.C1 = CFrame.identity;
		weld.Parent = part;
		return part;
	}

	private playAttackAnimation(character: CharacterModel, animationName: string, speed: number): boolean {
		const track = this.animation.getTrackByName(character, animationName);
		if (!track) return false;
		if (!track.playing()) this.animation.playAnimByName(character, animationName, true, { speed });
		return true;
	}

	private setDebugEnabled(enabled: boolean): void {
		this.debugEnabled = enabled;
		for (const [, window] of this.windows) window.part.Transparency = enabled ? 0.45 : 1;
	}

	private isValidWindow(packet: ClientHitboxWindow): boolean {
		const validNumber = (value: number): boolean => value === value && math.abs(value) < math.huge;
		const dimensions = [packet.size.X, packet.size.Y, packet.size.Z];
		const position = packet.offset.Position;
		return (
			packet.sessionId.size() > 0 &&
			validNumber(packet.startsAt) &&
			validNumber(packet.endsAt) &&
			validNumber(packet.cooldownEndsAt) &&
			validNumber(packet.animationSpeed) &&
			packet.endsAt > packet.startsAt &&
			packet.cooldownEndsAt >= packet.endsAt &&
			packet.animationSpeed > 0 &&
			packet.animationSpeed < 10 &&
			dimensions.every((dimension) => validNumber(dimension) && dimension > 0 && dimension <= 40) &&
			[position.X, position.Y, position.Z].every(validNumber)
		);
	}

	private update(): void {
		const now = Workspace.GetServerTimeNow();
		const hurtboxes = Workspace.FindFirstChild("Hurtbox");
		if (!hurtboxes) return;
		this.overlap.FilterDescendantsInstances = [hurtboxes];

		for (const [sessionId, window] of this.windows) {
			if (now > window.packet.endsAt) {
				this.finish(sessionId);
				continue;
			}
			if (window.root.CFrame.LookVector.Dot(window.startLook) < 0.75) {
				Events.game.hitbox.cancel(sessionId);
				this.finish(sessionId);
				continue;
			}
			if (now < window.packet.startsAt) continue;

			for (const part of Workspace.GetPartBoundsInBox(window.part.CFrame, window.packet.size, this.overlap)) {
				const reference = part.FindFirstChild("Reference");
				if (
					!reference ||
					!reference.IsA("ObjectValue") ||
					!reference.Value ||
					!isCharacterModel(reference.Value)
				)
					continue;
				const target = reference.Value;
				const humanoid = target.FindFirstChildOfClass("Humanoid");
				if (target === window.character || !humanoid || humanoid.Health <= 0) continue;
				Events.game.hitbox.report(sessionId, target);
				this.finish(sessionId);
				break;
			}
		}
	}

	private finish(sessionId: string): void {
		const window = this.windows.get(sessionId);
		if (!window) return;
		this.windows.delete(sessionId);
		window.part.Destroy();
	}

	private finishAll(cancel: boolean): void {
		for (const [sessionId] of this.windows) {
			if (cancel) Events.game.hitbox.cancel(sessionId);
			this.finish(sessionId);
		}
	}
}
