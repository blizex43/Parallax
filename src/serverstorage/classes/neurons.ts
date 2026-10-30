import { Players } from "@rbxts/services";
import type { Brain } from "serverstorage/components/brain";
import type { AttackHeaderService } from "serverstorage/services/attack-header";
import type { BlockService } from "serverstorage/services/block";
import type { JournalService } from "serverstorage/services/journal";
import { CombatState } from "shared/enums/config-enum";
import { HumanoidBaseWalkspeed } from "shared/enums/humanoid-enum";
import type { Memories } from "shared/structs/brain";
import { isBasePart, isModel } from "shared/utility/t-isA";
import type { NPCAction } from "shared/structs/brain";

const attackRange = 7;
const runRange = 18;

interface NeuralContext {
	model: CharacterModel;
	root: BasePart;
	humanoid: Humanoid;
	memories: Memories;
	target?: BasePart;
	distance: number;
	lightReady: boolean;
	heavyReady: boolean;
}

export class Neurons {
	private readonly actionHandlers: Record<NPCAction, (context: NeuralContext) => void> = {
		Idle: (context) => this.handleStopped(context),
		Walk: (context) => this.handleMovement(context, 1),
		Run: (context) => this.handleMovement(context, 1.5),
		Passive: (context) => this.handlePassive(context),
		Aggressive: (context) => this.handleAggressive(context),
		Block: (context) => this.handleBlocking(context),
		Attack: (context) => this.handleAttack(context),
	};

	public constructor(
		private readonly brain: Brain,
		private readonly journal: JournalService,
		private readonly attack: AttackHeaderService,
		private readonly block: BlockService,
	) {}

	public process(): void {
		const context = this.createContext();
		if (!context) {
			this.brain.pathing.stop();
			return;
		}
		this.actionHandlers[this.brain.logic.chooseAction(this.toFacts(context))](context);
	}

	private createContext(): Maybe<NeuralContext> {
		const memories = this.brain.memories;
		const model = this.brain.instance;
		const root = model.HumanoidRootPart;
		const humanoid = model.Humanoid;
		if (!memories || !root || !humanoid || humanoid.Health <= 0) return;

		const target = this.findClosestPlayer(model, root.Position);
		const distance = target ? target.Position.sub(root.Position).Magnitude : math.huge;
		const cooldowns = this.journal.fetchStateValue<Record<string, { end: number }>>(model, CombatState.Cooldowns);
		const blockedStates = [
			CombatState.Windup,
			CombatState.Recovery,
			CombatState.Attacking,
			CombatState.Block,
			CombatState.BlockBroken,
			CombatState.Stunned,
			CombatState.FullStunned,
			CombatState.Exhausted,
			CombatState.Knocked,
			CombatState.Ragdoll,
		];
		const canAttack =
			!this.attack.getRunningMeta(model).attacking &&
			blockedStates.every((state) => !this.journal.fetchStateValue<boolean>(model, state));
		return {
			model,
			root,
			humanoid,
			memories,
			target,
			distance,
			lightReady: canAttack && (!cooldowns?.Light || cooldowns.Light.end <= os.clock()),
			heavyReady: canAttack && (!cooldowns?.Heavy || cooldowns.Heavy.end <= os.clock()),
		};
	}

	private toFacts(context: NeuralContext) {
		return {
			targetPresent: context.target !== undefined,
			inAttackRange: context.distance <= attackRange,
			attackReady: context.lightReady || context.heavyReady,
			passive: context.memories.behavior === "passive",
			blocking: context.memories.preset === "blocking-dummy",
			canRun: context.memories.mastery !== "easy" && context.distance >= runRange,
		};
	}

	private handleBlocking(context: NeuralContext): void {
		this.block.handleBlock(context.model, true);
		this.brain.npcAnimation.setLocomotion("idle", 1, this.isCombatEquipped(context.model));
		this.brain.pathing.stop();
		context.humanoid.Move(Vector3.zero);
	}

	private handleAttack(context: NeuralContext): void {
		this.block.handleBlock(context.model, false);
		this.brain.pathing.stop();
		const attack = this.brain.resource.chooseAttack(
			context.model,
			context.memories,
			"Attack",
			context.lightReady,
			context.heavyReady,
		);
		if (attack) this.attack.onServerAttackInvoked(context.model, attack);
	}

	private handleAggressive(context: NeuralContext): void {
		if (context.distance <= attackRange + 1) return this.handleStopped(context);
		this.handleMovement(context, 1);
	}

	private handlePassive(context: NeuralContext): void {
		this.block.handleBlock(context.model, false);
		const target = context.target;
		if (!target) return this.handleStopped(context);

		this.brain.pathing.stop();
		const difference = target.Position.sub(context.root.Position);
		const flatDifference = new Vector3(difference.X, 0, difference.Z);
		if (flatDifference.Magnitude < 0.001) return context.humanoid.Move(Vector3.zero);

		const towardTarget = flatDifference.Unit;
		const aroundTarget = new Vector3(-towardTarget.Z, 0, towardTarget.X);
		const phase = os.clock();
		const radial =
			context.distance > runRange
				? 1
				: context.distance > attackRange + 2
					? 0.4 + math.sin(phase * 1.2) * 0.25
					: context.distance > attackRange
						? math.sin(phase * 1.5) * 0.55
						: 0;
		const side = math.sin(phase * 0.7) >= 0 ? 1 : -1;
		const moveDirection = towardTarget.mul(radial).add(aroundTarget.mul(side));
		context.humanoid.WalkSpeed = HumanoidBaseWalkspeed;
		context.humanoid.Move(moveDirection.Unit, false);
		this.brain.npcAnimation.setLocomotion("walk", 1, this.isCombatEquipped(context.model));
	}

	private handleMovement(context: NeuralContext, speedMultiplier: number): void {
		this.block.handleBlock(context.model, false);
		const target = context.target;
		if (!target) return this.handleStopped(context);

		context.humanoid.WalkSpeed = HumanoidBaseWalkspeed * speedMultiplier;
		this.brain.npcAnimation.setLocomotion("walk", speedMultiplier, this.isCombatEquipped(context.model));
		this.brain.pathing.pursue(target, context.humanoid.WalkSpeed);
	}

	private handleStopped(context: NeuralContext): void {
		this.block.handleBlock(context.model, false);
		this.brain.npcAnimation.setLocomotion("idle", 1, this.isCombatEquipped(context.model));
		this.brain.pathing.stop();
		context.humanoid.WalkSpeed = HumanoidBaseWalkspeed;
		context.humanoid.Move(Vector3.zero);
	}

	private isCombatEquipped(model: CharacterModel): boolean {
		return this.journal.fetchStateValue<boolean>(model, CombatState.CombatEquip) ?? false;
	}

	private findClosestPlayer(model: CharacterModel, position: Vector3): Maybe<BasePart> {
		let closest: Maybe<BasePart>;
		let closestDistance = math.huge;
		for (const player of Players.GetPlayers()) {
			const character = player.Character;
			if (!character || character === model) continue;
			const root = character.FindFirstChild("HumanoidRootPart");
			const humanoid = character.FindFirstChildOfClass("Humanoid");
			if (!isModel(character) || !isBasePart(root) || !humanoid || humanoid.Health <= 0) continue;
			const distance = root.Position.sub(position).Magnitude;
			if (distance < closestDistance) {
				closestDistance = distance;
				closest = root;
			}
		}
		return closest;
	}
}
