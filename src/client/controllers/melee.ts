import { Controller, OnStart } from "@flamework/core";
import { OnSignalSubscribed } from "shared/decorators";
import { CombatState, MiscState, MovementState, StateEvents } from "shared/enums/config-enum";
import type { WebsocketController } from "./websocket";
import type { CFrameController } from "./cframe";
import type { LogStart } from "shared/hooks";
import { Events } from "client/network";
import type { AttackPacket } from "shared/structs/packets";
import { Serializers } from "shared/network";
import { Meta } from "shared/meta";
import type { KeyboardController } from "./keyboard";
import { JournalHandler } from "shared/classes/journal-handler";
import type { JournalController } from "./journal";
import { AttackCatalog } from "shared/enums/catalog-enum";
import type { AttackLiterals } from "shared/structs/attack";
import { Workspace } from "@rbxts/services";
@Controller()
export class MeleeController extends JournalHandler implements OnStart, LogStart {
	private readonly cooldowns = new Map<AttackLiterals, number>();
	// public charm!: StateType<boolean>;
	constructor(
		private readonly cframe: CFrameController,
		private readonly keyboard: KeyboardController,
		readonly journal: JournalController,
	) {
		super(journal.util);
	}

	protected onOverride(on: boolean): void {
		this.journalUtil.write(CombatState.AttackExecutable, !on);
	}

	public onStart(): void {
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
					MiscState.Cutscene,
				],
				behavior: "Run If Single True",
			},
			{
				handleType: "overrideEnd",
				paths: [
					CombatState.Stunned,
					CombatState.FullStunned,
					CombatState.BlockBroken,
					CombatState.Block,
					CombatState.Ragdoll,
					CombatState.Exhausted,
					MiscState.Cutscene,
				],
				behavior: "Run If All False",
			},
		]);
	}
	@OnSignalSubscribed(StateEvents[CombatState.MouseOne])
	public onLight(on: boolean) {
		if (!this.canUse("Light", on)) return;
		this.startCooldown("Light");
		this.sendAttack(<AttackPacket>{ name: "Light" });
	}

	@OnSignalSubscribed(StateEvents[CombatState.MouseTwo])
	public onHeavy(on: boolean) {
		if (!this.canUse("Heavy", on)) return;
		this.startCooldown("Heavy");
		this.sendAttack(<AttackPacket>{ name: "Heavy" });
	}

	public applyServerCooldown(name: AttackLiterals, endsAt: number): void {
		this.cooldowns.set(name, math.max(this.cooldowns.get(name) ?? 0, endsAt));
	}

	private sendAttack(params: AttackPacket) {
		Events.game.attack(Serializers.attack.serialize(Meta.fill(params)));
	}

	private canUse(typeMelee: "Light" | "Heavy", on: boolean): boolean {
		const baseBools =
			!this.isBlacklisted() &&
			this.journalUtil.read<boolean>(CombatState.AttackExecutable)! &&
			this.journalUtil.read<boolean>(CombatState.CombatEquip)! &&
			on;
		const typeBool = typeMelee === "Light" ? true : this.journalUtil.read<boolean>(MovementState.Shiftlocked)!;
		return baseBools && typeBool && this.isCooldownReady(typeMelee);
	}

	private startCooldown(name: AttackLiterals): void {
		this.cooldowns.set(name, Workspace.GetServerTimeNow() + AttackCatalog[name].cooldown);
	}

	private isCooldownReady(name: AttackLiterals): boolean {
		return Workspace.GetServerTimeNow() >= (this.cooldowns.get(name) ?? 0);
	}
}
