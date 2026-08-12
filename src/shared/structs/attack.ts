import type { AilmentsArray, AnomalyArray, AttackArray, ModeArray, StanceArray } from "shared/enums/combat-enum";
import type { ScalingParams } from "./scale";
import type { AttackPacket } from "./packets";
import type { Light } from "serverstorage/services/sub-services/Light";
import type { Heavy } from "serverstorage/services/sub-services/Heavy";
import type { PsuedoPlayerData } from "shared/data-models/player-data";
import type { Janitor } from "@rbxts/janitor";
import type { AnimationTrackNames } from "./animation";
import type { CharacterLimbsType } from "./model";
import type { Hitbox } from "serverstorage/components/hitbox";
import type { EffectName, PacketSafeEffectOptions } from "./effect";
export type AttackLiterals = (typeof AttackArray)[number];
export type StanceLiterals = (typeof StanceArray)[number];
export type ModeLiterals = (typeof ModeArray)[number];
export type AilmentsLiterals = (typeof AilmentsArray)[number];
export type AnomalyLiterals = (typeof AnomalyArray)[number];
export type AttackTag = "Melee" | "Grab" | "Barrage" | "Projectile";

export interface AttackPhase {
	windup: number;
	recovery: number;
}

export interface HitPolicy {
	maxHitsPerTarget?: number;
	hitOnce?: boolean;
}

export interface BoxShape {
	kind: "Box";
	size: Vector3;
}

export interface SphereShape {
	kind: "Sphere";
	radius: number;
}

export interface CapsuleShape {
	kind: "Capsule";
	radius: number;
	length: number;
}

export type HitboxShape = BoxShape | SphereShape | CapsuleShape;

export type CastType = "Raycast" | "Blockcast" | "Spherecast";

export interface OverlapQuery {
	kind: "Overlap";
	shape: HitboxShape;
	offset: CFrame;
}

export interface ShapecastQuery {
	kind: "Shapecast";
	shape: HitboxShape;
	offset: CFrame;
	direction: Vector3;
	distance: number;
	castType?: CastType;
}

export type HitboxQuery = OverlapQuery | ShapecastQuery;

export interface GrabSpec {
	duration?: number;
	socket?: string;
}

export interface KnockbackSpec {
	direction: Vector3;
	power: number;
	duration: number;
	type?: "Normal" | "Super";
}

export interface RagdollSpec {
	direction?: Vector3;
	power?: number;
	duration: number;
}

export interface ClashSpec {
	priority: number;
	limb?: CharacterLimbsType;
}

export interface StunSpec {
	duration: number;
	type: "Normal" | "Full";
}
// Properties added if GuardBroken
export interface BreakerSpec {
	properties?: OnHitProperties;
	duration: number;
}

export interface AilmentSpec {
	ailment: AilmentsLiterals;
	duration: number;
}

export interface StaminaBlockSpec {
	amount: number;
	duration: number;
}

export interface EffectSpec {
	name: EffectName;
	options: PacketSafeEffectOptions;
}

export interface StyleAttributeSpec {
	included: AttackLiterals[];
	potency: number;
	offset?: number;
}

export interface AnomalySpec extends StyleAttributeSpec {
	type: AnomalyLiterals;
}
export interface OnHitProperties {
	damage: number;
	stun: StunSpec;
	flinchName?: AnimationTrackNames;
	grab?: GrabSpec;
	knockback?: KnockbackSpec;
	ragdoll?: RagdollSpec;
	breaker?: BreakerSpec;
	clash?: ClashSpec;
	staminaBlock?: StaminaBlockSpec;
	hitEffects?: EffectName[];
	ailments?: AilmentSpec[];
	anomaly?: AnomalySpec[];
}
export interface HitWindow {
	linger: number;
	stamina: number;
	query: HitboxQuery;
	repeat?: {
		count: number;
		interval: number;
	};
	maxLinger?: number;
	onHit: OnHitProperties;
}

export interface AttackDefinition {
	id: AttackLiterals;
	tags: AttackTag[];
	speed: number;
	cooldown: number;
	phases: AttackPhase;
	windows: HitWindow[];
	special?: HitWindow[];
	hitPolicy: HitPolicy;
	effect?: EffectSpec;
}

export interface AttackContext {
	character: CharacterModel;
	data: PsuedoPlayerData;
	scaling: ScalingParams;
	packet: AttackPacket;
}

export interface StyleContext {
	damage: StyleAttributeSpec;
	speed: StyleAttributeSpec;
	range: StyleAttributeSpec;
	stun: StyleAttributeSpec;
	anomaly?: AnomalySpec[];
}

export interface HitData {
	attacker: AttackContext;
	attacked: {
		character: CharacterModel;
	};
	properties: OnHitProperties;
}

export interface HitResult {
	query: HitboxQuery;
	window?: HitWindow;
	onHit?: HitWindow["onHit"];
	raycastResult?: RaycastResult;
	instance?: Instance;
	position?: Vector3;
	normal?: Vector3;
}

export interface RegisteredAttacksType {
	readonly Light: Light;
	readonly Heavy: Heavy;
}

export interface AttacksLibraryValues {
	readonly reference: AttackDefinition;
}

export interface LightData {
	promise: Maybe<Promise<void>>;
	janitor: Janitor;
	index: number;
	maxIndex: number;
	clock: number;
}

export interface PostableWindowData {
	window: HitWindow;
	context: AttackContext;
	hitbox: Hitbox;
}

export interface CharacterAttackingHeaderData {
	attacking: boolean;
	current: Maybe<AttackLiterals>;
	postData: Maybe<PostableWindowData>;
}
