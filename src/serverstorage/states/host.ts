import { Dependency } from "@flamework/core";
import type { FSM } from "@rbxts/state-management";
import type { AttackHeaderService } from "serverstorage/services/attack-header";
import type { BlockService } from "serverstorage/services/block";
import type { JournalService } from "serverstorage/services/journal";
import { AIBlackboardKey } from "shared/enums/config-enum";
import type { BlackboardStateType, StateType } from "shared/structs/websocket";

// Base state with common functionality
export default abstract class AIStateBase implements FSM.IFSMState {
	constructor(
		protected readonly character: CharacterModel,
		protected readonly journal: JournalService = Dependency<JournalService>(),
		protected readonly block: BlockService = Dependency<BlockService>(),
		protected readonly header = Dependency<AttackHeaderService>(),
	) { }
	protected abstract priority: number;

	public OnEnter(this: Writable<AIStateBase>, bb: BlackboardStateType): void { }

	public Update(this: Writable<AIStateBase>, dt: number, bb: BlackboardStateType): void { }

	public OnExit(this: Writable<AIStateBase>, bb: BlackboardStateType): void { }

	protected getAggression(bb: BlackboardStateType): boolean {
		return (<StateType<boolean>>bb.Get(AIBlackboardKey.Aggression)).status ?? false;
	}

	protected getCombatRange(bb: BlackboardStateType): number {
		if (!bb) return 0;
		return (<StateType<number>>bb.Get(AIBlackboardKey.CombatRange)).status ?? 0;
	}

	protected getAttackCooldown(bb: BlackboardStateType): number {
		return (<StateType<number>>bb?.Get(AIBlackboardKey.AttackCooldown)).status ?? 999;
	}

	protected shouldChase(bb: BlackboardStateType): boolean {
		return (<StateType<boolean>>bb.Get(AIBlackboardKey.ChaseTarget)).status ?? false;
	}

	protected shouldBlock(bb: BlackboardStateType): boolean {
		return (<StateType<boolean>>bb.Get(AIBlackboardKey.BlockDefensively)).status ?? false;
	}

	protected isDummy(bb: BlackboardStateType): boolean {
		return (<StateType<boolean>>bb.Get(AIBlackboardKey.TakeDamageOnly)).status ?? false;
	}

	protected getMovementSpeed(bb: BlackboardStateType): number {
		return (<StateType<number>>bb.Get(AIBlackboardKey.MovementSpeed)).status ?? 1;
	}

	protected getPatrolRadius(bb: BlackboardStateType): number {
		return (<StateType<number>>bb.Get(AIBlackboardKey.PatrolRadius)).status ?? 0;
	}
}


