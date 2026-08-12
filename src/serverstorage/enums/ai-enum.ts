import { Blackboard, FSM } from "@rbxts/state-management";
import DummyAttackState from "serverstorage/states/dummy-attack";
import DummyBlockState from "serverstorage/states/dummy-block";
import DummyState from "serverstorage/states/dummy-idle";
import { AIBlackboardKey } from "shared/enums/config-enum";
import type { AIPresetConfig, AIPresetName } from "shared/structs/ai";
import type { BlackboardStateType } from "shared/structs/websocket";

/**
 * Default AI preset configurations - plain objects that can be cloned
 */
export const PresetConfigs = {
	// Dummy/Training AI (swings nonstop)
	attack: <AIPresetConfig>{
		[AIBlackboardKey.Aggression]: false,
		[AIBlackboardKey.CombatRange]: 0,
		[AIBlackboardKey.AttackCooldown]: 999,
		[AIBlackboardKey.ChaseTarget]: false,
		[AIBlackboardKey.BlockDefensively]: false,
		[AIBlackboardKey.TakeDamageOnly]: true,
		[AIBlackboardKey.PatrolRadius]: 0,
		[AIBlackboardKey.DetectionRange]: 0,
		[AIBlackboardKey.RetreatThreshold]: 0,
		[AIBlackboardKey.MovementSpeed]: 0,
		[AIBlackboardKey.StrafeDistance]: 0,
		[AIBlackboardKey.TargetPriority]: 99,
		[AIBlackboardKey.PreferredRange]: 0,
		[AIBlackboardKey.IsInvincible]: true,
	},

	// Dummy/Training AI that blocks nonstop (for testing block breaking)
	blocking: <AIPresetConfig>{
		[AIBlackboardKey.Aggression]: false,
		[AIBlackboardKey.CombatRange]: 0,
		[AIBlackboardKey.AttackCooldown]: 999,
		[AIBlackboardKey.ChaseTarget]: false,
		[AIBlackboardKey.BlockDefensively]: true,
		[AIBlackboardKey.TakeDamageOnly]: false,
		[AIBlackboardKey.PatrolRadius]: 0,
		[AIBlackboardKey.DetectionRange]: 0,
		[AIBlackboardKey.RetreatThreshold]: 0,
		[AIBlackboardKey.MovementSpeed]: 0,
		[AIBlackboardKey.StrafeDistance]: 0,
		[AIBlackboardKey.TargetPriority]: 2,
		[AIBlackboardKey.PreferredRange]: 0,
	},

	// Dummy/Training AI (doesn't fight back, just takes damage)
	idle: <AIPresetConfig>{
		[AIBlackboardKey.Aggression]: false,
		[AIBlackboardKey.CombatRange]: 0,
		[AIBlackboardKey.AttackCooldown]: 999,
		[AIBlackboardKey.ChaseTarget]: false,
		[AIBlackboardKey.BlockDefensively]: false,
		[AIBlackboardKey.TakeDamageOnly]: true,
		[AIBlackboardKey.PatrolRadius]: 0,
		[AIBlackboardKey.DetectionRange]: 0,
		[AIBlackboardKey.RetreatThreshold]: 0,
		[AIBlackboardKey.MovementSpeed]: 0,
		[AIBlackboardKey.StrafeDistance]: 0,
		[AIBlackboardKey.TargetPriority]: 99,
		[AIBlackboardKey.PreferredRange]: 0,
		[AIBlackboardKey.IsInvincible]: true,
	},
};

/**
 * Pre-initialized blackboards (use with caution - these are shared unless cloned)
 */
export const DefaultBlackboards: Record<AIPresetName, Blackboard> = <const>{
	attack: new Blackboard({ ...PresetConfigs.attack }),
	blocking: new Blackboard({ ...PresetConfigs.blocking }),
	idle: new Blackboard({ ...PresetConfigs.idle }),
};
export const DefaultFSMCalls = <const>{
	blocking: (bb: BlackboardStateType, character: CharacterModel): FSM.FSM => {
		const fsm = new FSM.FSM("BlockState", bb);
		fsm.RegisterState("BlockState", new DummyBlockState(character));
		return fsm
	},
	attack: (bb: BlackboardStateType, character: CharacterModel): FSM.FSM => {
		const fsm = new FSM.FSM("Attack", bb);
		fsm.RegisterState("Attack", new DummyAttackState(character));
		return fsm;
	},
	idle: (bb: BlackboardStateType, character: CharacterModel): FSM.FSM => {
		const fsm = new FSM.FSM("Idle", bb);
		fsm.RegisterState("Idle", new DummyState(character));
		return fsm;
	},
};
