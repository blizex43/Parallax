import type { UUIDS } from "shared/enums/config-enum";
import type { Hitbox } from "shared/forks/shapecasthitbox/Types";

export interface HurtboxAttributes {
	UUID: UUIDS.Hitbox;
	duration: number;
	forceHurtboxDetection: boolean;
	maxQueryable: number;
}

export interface HurtboxLiteral extends BasePart {
	Reference: ObjectValue;
}

export type HitboxType = Hitbox;
