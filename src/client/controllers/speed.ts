import { Controller, OnRender, OnStart } from "@flamework/core";
import { LogStart } from "shared/hooks";
import {
	CombatState,
	IncrementalMovementConfig,
	MovementConfig,
	MovementState,
	VitalityState,
} from "shared/enums/config-enum";
import Object from "@rbxts/object-utils";
import { Sigmoid } from "shared/classes/sigmoid";
import { FlameworkCharms, WalkspeedChanged } from "shared/constants";
import type { CharacterController } from "./character";
import { isNull } from "shared/utility/t-isA";
import type { ScalingController } from "./scaling";
@Controller()
export class SpeedController implements OnStart, OnRender, LogStart {
	private readonly transitionTime: number = 0.15; // seconds
	private readonly sigmoid: Sigmoid = new Sigmoid({ initTransition: 1 });
	private transitionFromSpeed = 0;
	private transitionToSpeed = 0;
	constructor(
		private readonly character: CharacterController,
		private readonly scaling: ScalingController,
	) {}
	public onStart(): void {
		this.makeMovementConditions();
	}
	public onRender(dt: number): void {
		const humanoid = this.character.getHumanoid();
		if (!humanoid) return;
		this.renderWalkspeed(humanoid, dt);
	}

	private renderWalkspeed(humanoid: Humanoid, dt: number): void {
		const currentSpeed = humanoid.WalkSpeed;
		const baseWalkSpeed = this.scaling.getNormalWalkSpeed();
		const healthMultiplier = this.resolveHealthMultiplier(humanoid.Health);
		const stateMultiplier = this.resolveStateMultiplier();
		const transitionTime = this.resolveTransitionTime();
		const targetSpeed = baseWalkSpeed * stateMultiplier * healthMultiplier;

		if (math.abs(this.transitionToSpeed - targetSpeed) > 1e-3) {
			this.transitionFromSpeed = currentSpeed;
			this.transitionToSpeed = targetSpeed;
			this.sigmoid.setClampedTransitionAlpha(0);
		}

		const alpha = this.sigmoid.getTransitionAlpha();
		if (alpha < 1) {
			const alpha = this.sigmoid.getTransitionAlpha();
			this.sigmoid.setClampedTransitionAlpha(alpha + dt / transitionTime);
			humanoid.WalkSpeed = this.sigmoid.playLerp(this.transitionFromSpeed, this.transitionToSpeed, alpha);
			WalkspeedChanged.Fire();
			return;
		}

		if (math.abs(currentSpeed - this.transitionToSpeed) > 1e-3) {
			humanoid.WalkSpeed = this.transitionToSpeed;
			WalkspeedChanged.Fire();
		}
	}

	private resolveStateMultiplier(): number {
		const baseWalkSpeed = MovementConfig[MovementState.Walk]?.speed ?? 16;
		let currentPriority = 1;
		let currentFoundSpeed = baseWalkSpeed;
		for (const [name, stateConfig] of pairs(MovementConfig)) {
			if (isNull(stateConfig.condition)) continue;
			if (stateConfig.condition() && stateConfig.priority >= currentPriority) {
				currentPriority = stateConfig.priority;
				if (name === MovementState.Sprint) currentFoundSpeed = this.scaling.getSpeed(stateConfig.speed);
				else currentFoundSpeed = stateConfig.speed;
			}
		}
		return currentFoundSpeed / math.max(1, baseWalkSpeed);
	}

	private resolveTransitionTime(): number {
		let transitionTime = this.transitionTime;
		let currentPriority = 1;
		for (const [, stateConfig] of pairs(MovementConfig)) {
			if (isNull(stateConfig.overrideFade) || isNull(stateConfig.condition)) continue;
			if (stateConfig.condition() && stateConfig.priority >= currentPriority) {
				currentPriority = stateConfig.priority;
				transitionTime = stateConfig.overrideFade;
			}
		}
		return transitionTime;
	}

	private resolveHealthMultiplier(currentHealth: number): number {
		const healthConfig = IncrementalMovementConfig[VitalityState.Health]!;
		const maxHealthValue = math.max(...Object.keys(healthConfig).map((healthKey) => tonumber(healthKey) ?? 0));
		if (currentHealth > maxHealthValue) return 1;

		let selectedHealth = math.huge;
		let selectedConfig: (typeof healthConfig)[number] | undefined;
		for (const [healthKey, config] of pairs(healthConfig)) {
			const health = tonumber(tostring(healthKey));
			if (!health) continue;
			if (currentHealth <= health && currentHealth >= config.minRange && health < selectedHealth) {
				selectedHealth = health;
				selectedConfig = config;
			}
		}

		if (!selectedConfig) return 1;
		const clampedHealth = math.clamp(currentHealth, selectedConfig.minRange, selectedHealth);
		const range = math.max(1, selectedHealth - selectedConfig.minRange);
		const alpha = (selectedHealth - clampedHealth) / range;
		const reductionPercent =
			selectedConfig.startPercent + (selectedConfig.maxPercent - selectedConfig.startPercent) * alpha;
		return math.max(0, 1 - reductionPercent / 100);
	}

	private makeMovementConditions(): void {
		for (const [configName, config] of pairs(MovementConfig)) {
			if (configName in FlameworkCharms) {
				const callback = FlameworkCharms[<CombatState.Block>configName];
				config.condition = callback;
			}
		}
	}
}
