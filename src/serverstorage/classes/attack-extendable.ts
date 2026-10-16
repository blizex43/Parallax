import { Dependency } from "@flamework/core";
import Signal from "@rbxts/signal";
import { Hitbox } from "serverstorage/components/hitbox";
import type { AnimationService } from "serverstorage/services/animation";
import type { VFXService } from "serverstorage/services/effect";
import type { HurtboxService } from "serverstorage/services/hurtbox";
import type { StaminaService } from "serverstorage/services/stamina";
import type { JournalService } from "serverstorage/services/journal";
import { TrackComponent } from "shared/components/track";
import { DamageRecieved, PostWindowData } from "shared/constants";
import { CombatState } from "shared/enums/config-enum";
import { CastEnums } from "shared/enums/cast-enum";
import { StyleCatalog } from "shared/enums/style-catalog-enum";
import { AnimationTrackNames } from "shared/structs/animation";
import type {
	AnomalySpec,
	AttackContext,
	AttackDefinition,
	AttackLiterals,
	BoxShape,
	HitData,
	HitWindow,
} from "shared/structs/attack";
import type { CharacterLimbsType } from "shared/structs/model";
import type { EffectPacket } from "shared/structs/packets";
import type { Styles } from "shared/structs/styles";
import { Players } from "@rbxts/services";
import type { HitboxValidationService } from "serverstorage/services/hitbox-validation";
import type { AnimationReplicatorService } from "serverstorage/services/animation-replicator";
import { HitboxAttributes } from "serverstorage/enums/hitbox-enum";
import { AttackTimingCatalog } from "shared/enums/attack-timing-enum";
export abstract class AttackExtendable {
	abstract readonly lib: AttackDefinition;
	abstract readonly nameof: AttackLiterals;
	abstract cancellable?(character: CharacterModel, ...args: unknown[]): boolean;
	abstract getAnimationName(context: AttackContext, ...args: unknown[]): AnimationTrackNames;
	protected readonly cancelledSignal: Signal<(ctx: AttackContext) => void, false> = new Signal();
	protected readonly services = {
		hurtbox: Dependency<HurtboxService>(),
		animation: Dependency<AnimationService>(),
		journal: Dependency<JournalService>(),
		effect: Dependency<VFXService>(),
		stamina: Dependency<StaminaService>(),
		hitbox: Dependency<HitboxValidationService>(),
		animationReplicator: Dependency<AnimationReplicatorService>(),
	};

	public defaultCreateHitData(context: AttackContext, window: HitWindow, character: CharacterModel): HitData {
		return {
			attacked: { character },
			attacker: context,
			properties: {
				damage:
					this.getStyleAttribute(context.data.style, "damage") *
					(window.onHit.damage + context.scaling.attack.damage),
				stun: {
					duration: this.getStyleAttribute(context.data.style, "stun") * context.scaling.attack.stun,
					type: window.onHit.stun.type,
				},
				ragdoll: window.onHit.ragdoll,
				knockback: window.onHit.knockback,
				grab: window.onHit.grab,
				clash: window.onHit.clash,
				ailments: window.onHit.ailments,
				breaker: window.onHit.breaker,
				hitEffects: window.onHit.hitEffects,
				anomaly: this.getAnomalies(context.data.style, window),
				staminaBlock: window.onHit.staminaBlock,
			},
		};
	}

	public cancelled(context: AttackContext): void {
		const { character, data } = context;
		const track = this.getAnimation(context);
		if (this.cancellable && !this.cancellable(character, data, track)) return;
		this.cancelledSignal.Fire(context);
		this.services.hitbox.cancelCharacter(character);
		task.delay(this.getWindupTime(context), () => this.active(context, false));
		if (track && track.playing()) track.stop();
	}

	protected effect(options: EffectPacket) {
		return this.services.effect.effectReplicate(options);
	}

	protected windup(context: AttackContext, duration: number): void {
		return void this.services.journal
			.fetchUtil(context.character)
			?.writeFor(CombatState.Windup, true, duration, false);
	}

	protected drain(context: AttackContext, window: HitWindow) {
		return this.services.stamina.harm(context.character, window.stamina, true, true);
	}

	protected getCumulativeWindowTime(): number {
		return this.lib.windows.reduce((accumulator, current) => accumulator + current.linger, 0);
	}

	protected getAttackFullTime(context: AttackContext): number {
		return (
			this.getWindupTime(context) + this.getScaledCumulativeWindowTime(context) + this.getRecoveryTime(context)
		);
	}

	protected getScaledCumulativeWindowTime(context: AttackContext): number {
		return this.getLingerTime(context, <HitWindow>{
			linger: this.getCumulativeWindowTime(),
		});
	}

	protected recovery(context: AttackContext, duration: number): void {
		return void this.services.journal
			.fetchUtil(context.character)
			?.writeFor(CombatState.Recovery, true, duration, false);
	}

	protected cooldown(context: AttackContext, duration: number): void {
		const serverDuration = duration * 0.8;
		return void this.services.journal.writeStateValueRecordFor(
			context.character,
			CombatState.Cooldowns,
			this.nameof,
			{
				start: os.clock(),
				end: os.clock() + serverDuration,
				halted: false,
			},
			serverDuration,
		);
	}

	protected getLimb(track: TrackComponent): Maybe<CharacterLimbsType> {
		return track.getDescription("LimbTarget");
	}

	protected active(context: AttackContext, on: boolean): void {
		return void this.services.journal.writeStateValue(context.character, CombatState.Attacking, on);
	}

	protected post(context: AttackContext, window: HitWindow, hitbox?: Hitbox): void {
		return PostWindowData.Fire(context.character, {
			hitbox,
			window,
			context,
		});
	}

	protected async enterDefaultAttackSequence(
		context: AttackContext,
		track: TrackComponent,
		clientCooldown: number = this.getCooldown(context),
	): Promise<boolean> {
		const windupTime = this.getWindupTime(context);
		this.windup(context, windupTime);
		const clientOwned = Players.GetPlayerFromCharacter(context.character) !== undefined;
		for (let win = 0; win < this.lib.windows.size(); win++) {
			const window = this.lib.windows[win];
			const hitbox = clientOwned ? undefined : this.createAndScale(context, track, window);
			if (!clientOwned && !hitbox) {
				this.active(context, false);
				return false;
			}
			if (clientOwned) this.scaleTrack(context, track);
			await this.defaultSequence(track, hitbox, context, window, clientCooldown).catch(() =>
				this.active(context, false),
			);
		}
		return true;
	}

	protected defaultSequence(
		track: TrackComponent,
		hitbox: Maybe<Hitbox>,
		context: AttackContext,
		window: HitWindow,
		clientCooldown: number = this.getCooldown(context),
	): Promise<void> {
		const animName = this.getAnimationName?.(context);
		if (!animName) return Promise.resolve();
		const windup = this.getWindupTime(context);
		const duration = this.getLingerTime(context, window);
		const player = Players.GetPlayerFromCharacter(context.character);
		if (player) {
			const size = HitboxAttributes.Size.mul(this.getRange(context, window));
			this.post(context, window);
			this.services.animationReplicator.replicate(context.character, animName, true, true, [], {
				speed: track.speed,
			});
			this.services.hitbox.beginWindow(
				context,
				window,
				animName,
				windup,
				duration,
				clientCooldown,
				track.speed,
				window.query.offset,
				size,
				(character) => this.success(this.defaultCreateHitData(context, window, character)),
			);
		} else {
			if (!hitbox) return Promise.resolve();
			this.services.animationReplicator.replicate(context.character, animName, true, true, [], {
				speed: track.speed,
			});
			hitbox.link((character) => this.success(this.defaultCreateHitData(context, window, character)));
			this.post(context, window, hitbox);
		}

		return new Promise((resolve) => {
			let finished = false;
			const finish = (): void => {
				if (finished) return;
				finished = true;
				this.active(context, false);
				if (hitbox) hitbox.onDestroy();
				connection.Disconnect();
				resolve();
			};
			const connection = this.cancelledSignal.Connect((cancelledContext) => {
				if (cancelledContext.character === context.character) finish();
			});
			task.delay(windup, () => {
				if (finished) return;
				this.active(context, true);
				this.drain(context, window);
				if (hitbox) hitbox.start();
			});
			task.delay(windup + duration, finish);
		});
	}

	protected success(hitData: HitData): void {
		return DamageRecieved.Fire(hitData);
	}

	protected async defaultOnFinished(context: AttackContext, cooldown: number): Promise<void> {
		this.cooldown(context, cooldown);
		task.wait(this.getRecoveryTime(context));
		this.active(context, false);
		this.recovery(context, this.lib.phases.recovery / context.scaling.attack.speed);
	}

	protected getRecoveryTime(context: AttackContext): number {
		return (
			this.lib.phases.recovery /
			context.scaling.attack.speed /
			this.getStyleAttribute(context.data.style, "speed") /
			this.getStyleOffset(context.data.style, "speed")
		);
	}

	protected getWindupTime(context: AttackContext): number {
		return (
			AttackTimingCatalog[context.data.style][this.nameof].windup /
			context.scaling.attack.speed /
			this.getStyleAttribute(context.data.style, "speed") /
			this.getStyleOffset(context.data.style, "speed")
		);
	}

	protected getLingerTime(context: AttackContext, window: HitWindow): number {
		let linger =
			AttackTimingCatalog[context.data.style][this.nameof].active /
			context.scaling.attack.speed /
			this.getStyleAttribute(context.data.style, "speed");
		if (window.maxLinger) linger = math.min(window.maxLinger, linger);
		return linger;
	}

	protected getCooldown(context: AttackContext): number {
		return this.lib.cooldown / math.min(1, context.scaling.attack.speed);
	}

	protected canAttack(character: CharacterModel): boolean {
		const attackStates = CastEnums.find((enums) => enums.name === "Attack")?.castables ?? [];
		const hasActiveState = attackStates.some((state) =>
			this.services.journal.fetchStateValue<boolean>(character, state),
		);
		const cooldowns = this.services.journal.fetchStateValue<Record<string, unknown>>(
			character,
			CombatState.Cooldowns,
		);
		return !hasActiveState && !(cooldowns && this.nameof in cooldowns);
	}

	protected getAnimation(context: AttackContext): Maybe<TrackComponent> {
		if (!this.getAnimationName) return;
		const { character } = context;
		return this.services.animation.getTrack(character, <"walk">this.getAnimationName(context));
	}

	protected createAndScale(context: AttackContext, track: TrackComponent, window: HitWindow): Maybe<Hitbox> {
		const hitbox = this.createHitbox(context);
		if (!hitbox) return;
		this.scaleHitbox(context, window, hitbox);
		this.scaleTrack(context, track);
		return hitbox;
	}

	protected getRange(context: AttackContext, window: HitWindow): Vector3 {
		return new Vector3(
			context.scaling.size.x,
			context.scaling.size.y,
			this.getStyleAttribute(context.data.style, "range") *
				this.getStyleOffset(context.data.style, "range") *
				(context.scaling.size.z * context.scaling.size.y),
		).mul((<BoxShape>window.query.shape).size);
	}

	protected scaleHitbox(context: AttackContext, window: HitWindow, hitbox: Hitbox): void {
		hitbox.setDuration(this.getLingerTime(context, window));
		hitbox.setSize(this.getRange(context, window));
		if (this.lib.hitPolicy.hitOnce) hitbox.setMaxQueryable(1);
	}

	protected scaleTrack(context: AttackContext, track: TrackComponent): void {
		return void track.modifySpeed(
			this.lib.speed * (this.getStyleAttribute(context.data.style, "speed") * context.scaling.attack.speed),
		);
	}

	protected createHitbox(context: AttackContext): Maybe<Hitbox> {
		const character = context.character;
		const hurtbox = this.services.hurtbox.getHurtbox(character);
		if (!hurtbox) return;
		const hitbox = Hitbox.create(character);
		hitbox.toBlacklist(character, hurtbox.instance);
		return hitbox;
	}

	protected getStyleAttribute(
		style: Styles,
		attribute: "damage" | "stun" | "speed" | "range",
		defaultValue = 1,
	): number {
		const entry = StyleCatalog[style][attribute];
		return entry.included.includes(this.nameof) ? entry.potency : defaultValue;
	}

	protected getStyleOffset(
		style: Styles,
		attribute: "damage" | "stun" | "speed" | "range",
		defaultValue = 1,
	): number {
		const entry = StyleCatalog[style][attribute];
		return entry.included.includes(this.nameof) && entry.offset ? entry.offset : defaultValue;
	}

	private getAnomalies(style: Styles, window: HitWindow): Maybe<AnomalySpec[]> {
		const entry = StyleCatalog[style]["anomaly"];
		if (!entry) return window.onHit.anomaly;
		const winAnomaly = window.onHit.anomaly ?? [];
		return [...entry, ...winAnomaly];
	}
}
