import type { AnimationTrackNames } from "./animation";
import type { AilmentSpec } from "./attack";

export interface DamageTree {
	damage: number;
	stun: number;
	blocked: boolean;
	blockBroken: boolean;
	iframed: boolean;
	clashed: boolean;
	ailments: AilmentSpec[];
	flinchName: Maybe<AnimationTrackNames>;
	healthOutput: number;
	knockback?: Vector3;
	damaged?: boolean;
}
