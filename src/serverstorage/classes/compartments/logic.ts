import { planner, type Action, type GoalFacts } from "@rbxts/goap-solver";
import type { LogicFacts, NPCAction } from "shared/structs/brain";

const goal: GoalFacts = { decided: true };
const decisionActions: Action[] = [
	{
		name: "Passive",
		preconditions: { passive: true },
		effects: { decided: true },
		priority: 100,
	},
	{
		name: "Block",
		preconditions: { passive: false, blocking: true },
		effects: { decided: true },
		priority: 90,
	},
	{
		name: "Attack",
		preconditions: {
			passive: false,
			blocking: false,
			targetPresent: true,
			inAttackRange: true,
			attackReady: true,
		},
		effects: { decided: true },
		priority: 80,
	},
	{
		name: "Run",
		preconditions: {
			passive: false,
			blocking: false,
			targetPresent: true,
			inAttackRange: false,
			canRun: true,
		},
		effects: { decided: true },
		priority: 70,
	},
	{
		name: "Walk",
		preconditions: {
			passive: false,
			blocking: false,
			targetPresent: true,
			inAttackRange: false,
			canRun: false,
		},
		effects: { decided: true },
		priority: 60,
	},
	{
		name: "Aggressive",
		preconditions: {
			passive: false,
			blocking: false,
			targetPresent: true,
			inAttackRange: true,
			attackReady: false,
		},
		effects: { decided: true },
		priority: 50,
	},
	{
		name: "Idle",
		preconditions: { passive: false, blocking: false, targetPresent: false },
		effects: { decided: true },
		priority: 40,
	},
];

const actionsByName: Record<string, NPCAction> = {
	Idle: "Idle",
	Walk: "Walk",
	Run: "Run",
	Passive: "Passive",
	Aggressive: "Aggressive",
	Block: "Block",
	Attack: "Attack",
};

export class LogicCompartment {
	private readonly state: GoalFacts = {
		targetPresent: false,
		inAttackRange: false,
		attackReady: false,
		passive: false,
		blocking: false,
		canRun: false,
	};
	private lastFactsKey?: number;
	private lastAction: NPCAction = "Idle";

	public chooseAction(facts: LogicFacts): NPCAction {
		const key = this.factsKey(facts);
		if (key === this.lastFactsKey) return this.lastAction;

		this.lastFactsKey = key;
		this.state.targetPresent = facts.targetPresent;
		this.state.inAttackRange = facts.inAttackRange;
		this.state.attackReady = facts.attackReady;
		this.state.passive = facts.passive;
		this.state.blocking = facts.blocking;
		this.state.canRun = facts.canRun;

		const selectedName = planner(this.state, goal, decisionActions)?.[0]?.name;
		this.lastAction = actionsByName[selectedName ?? ""] ?? "Idle";
		return this.lastAction;
	}

	private factsKey(facts: LogicFacts): number {
		return (
			(facts.targetPresent ? 1 : 0) |
			((facts.inAttackRange ? 1 : 0) << 1) |
			((facts.attackReady ? 1 : 0) << 2) |
			((facts.passive ? 1 : 0) << 3) |
			((facts.blocking ? 1 : 0) << 4) |
			((facts.canRun ? 1 : 0) << 5)
		);
	}
}
