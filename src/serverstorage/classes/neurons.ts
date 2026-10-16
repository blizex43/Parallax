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
	lightReady: boolean;
	heavyReady: boolean;
}

export class Neurons {
	private readonly actionHandlers: Record<NPCAction, (context: NeuralContext) => void> = {
		Idle: (context) => this.handleStopped(context),
		Walk: (context) => this.handleMovement(context, 1),
		Run: (context) => this.handleMovement(context, 1.5),
		Passive: (context) => this.handleStopped(context),
		Aggressive: (context) => this.handleMovement(context, 1),
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

		const cooldowns = this.journal.fetchStateValue<Record<string, { end: number }>>(model, CombatState.Cooldowns);
		const canAttack =
			!this.attack.getRunningMeta(model).attacking &&
			!this.journal.fetchStateValue<boolean>(model, CombatState.Stunned) &&
			!this.journal.fetchStateValue<boolean>(model, CombatState.FullStunned);
		return {
			model,
			root,
			humanoid,
			memories,
			target: this.findClosestPlayer(model, root.Position),
			lightReady: canAttack && (!cooldowns?.Light || cooldowns.Light.end <= os.clock()),
			heavyReady: canAttack && (!cooldowns?.Heavy || cooldowns.Heavy.end <= os.clock()),
		};
	}

	private toFacts(context: NeuralContext) {
		const distance = context.target ? context.target.Position.sub(context.root.Position).Magnitude : math.huge;
		return {
			targetPresent: context.target !== undefined,
			inAttackRange: distance <= attackRange,
			attackReady: context.lightReady || context.heavyReady,
			passive: context.memories.behavior === "passive",
			blocking: context.memories.preset === "blocking-dummy",
			canRun: context.memories.mastery !== "easy" && distance >= runRange,
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
