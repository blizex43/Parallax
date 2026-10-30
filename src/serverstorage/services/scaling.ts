import { MockScaleClassDependencies, StatTuning } from "shared/enums/scale-enum";
import type { DataService } from "./third-party/data";
import type {
	MakeshiftParams,
	MockScaleDependencies,
	ScaleClass,
	ScalingDependencies,
	ScalingParams,
} from "shared/structs/scale";
import { getPercentOf, sum } from "shared/utility/numbers";
import { getStatRatio, scaleStatValue } from "shared/utility/stat-scaling";
import { Service } from "@flamework/core";
import type { PsuedoPlayerData } from "shared/data-models/player-data";
import { RegenProperties } from "shared/enums/regen-enum";
import { DashProperties } from "shared/enums/push-enum";
const { min, max } = math;
@Service()
export class ScalingService {
	constructor(private readonly data: DataService) {}
	public get(player: Player): Maybe<ScalingParams> {
		const playerData = this.data.get(player);
		if (!playerData) return;
		return this.scale(playerData);
	}

	public getByMakeshift(params: MakeshiftParams): Maybe<ScalingParams> {
		const scaled = params.manual
			? this.scale(params.manual)
			: params.class
				? this.scaleByClass(params.class)
				: undefined;

		return scaled;
	}

	public getByPsuedo(data: PsuedoPlayerData): ScalingParams {
		return this.scale(data);
	}

	public getRegen(data: PsuedoPlayerData, kind: "Health" | "Stamina" = "Health"): number {
		const maxValue = this.getMax(data, kind);

		const regenRate =
			kind === "Health"
				? data.inCombat
					? RegenProperties.HealthPerTickInCombat
					: RegenProperties.HealthPerTick
				: data.inCombat
					? RegenProperties.StaminaPerTickInCombat
					: RegenProperties.StaminaPerTick;

		// stamina updates 10x per second
		const tickMultiply = kind === "Stamina" ? RegenProperties.StaminaTickInterval : RegenProperties.HealthPerTick;
		const maxRate =
			kind === "Stamina" ? maxValue / RegenProperties.BaseStamina : maxValue / RegenProperties.BaseHealth;
		return maxRate * (regenRate * tickMultiply);
	}

	public getStaminaAttack(data: PsuedoPlayerData) {
		const totalRegen = RegenProperties.SprintStaminaPerTick;
		const agilityDebuff = scaleStatValue("agility", data.agility, {
			increment: StatTuning.stamina.sprintIncrement.agility,
			maximum: StatTuning.cap.agility,
		});
		const upperMuscleDebuff = scaleStatValue("upperBodyMuscle", data.upperBodyMuscle, {
			increment: StatTuning.stamina.sprintIncrement.upperBodyMuscle,
			maximum: StatTuning.cap.upperBodyMuscle,
		});
		const lowerMuscleDebuff = scaleStatValue("lowerBodyMuscle", data.lowerBodyMuscle, {
			increment: StatTuning.stamina.sprintIncrement.lowerBodyMuscle,
			maximum: StatTuning.cap.lowerBodyMuscle,
		});
		return sum(totalRegen, agilityDebuff, upperMuscleDebuff, lowerMuscleDebuff);
	}

	public getStaminaSprintRegen(data: PsuedoPlayerData): number {
		return this.getStaminaAttack(data) * RegenProperties.StaminaTickInterval;
	}

	public getDashStaminaTake(data: PsuedoPlayerData): number {
		const maxStamina = this.getMax(data, "Stamina");

		const upperMuscleDebuff = scaleStatValue("upperBodyMuscle", data.upperBodyMuscle, {
			increment: StatTuning.stamina.dashIncrement.upperBodyMuscle,
			minimum: StatTuning.baseDensity.muscle,
			maximum: StatTuning.cap.upperBodyMuscle,
		});
		const lowerMuscleDebuff = scaleStatValue("lowerBodyMuscle", data.lowerBodyMuscle, {
			increment: StatTuning.stamina.dashIncrement.lowerBodyMuscle,
			minimum: StatTuning.baseDensity.muscle,
			maximum: StatTuning.cap.lowerBodyMuscle,
		});

		const fatDebuff = scaleStatValue("fat", data.fat, {
			increment: StatTuning.stamina.dashIncrement.fat,
			minimum: StatTuning.baseDensity.fat,
			maximum: StatTuning.cap.fat,
		});

		const totalDashAmount = getPercentOf(
			maxStamina,
			sum(DashProperties.Percent, upperMuscleDebuff + lowerMuscleDebuff + fatDebuff),
		);
		return totalDashAmount;
	}

	public getMax(data: PsuedoPlayerData, kind: "Health" | "Stamina" = "Health"): number {
		const dataKind = kind === "Health" ? "vigor" : "stamina";
		const baseScaleKind = kind === "Health" ? RegenProperties.BaseHealth : RegenProperties.BaseStamina;
		return scaleStatValue(dataKind, data[dataKind], {
			minimum: 0,
			maximum: StatTuning.cap[dataKind],
			trueScale: true,
			startValue: baseScaleKind,
		});
	}

	private scaleByClass(scaleClass: ScaleClass): ScalingParams {
		return this.scale(this.convertMockToReal(MockScaleClassDependencies[scaleClass]));
	}

	private convertMockToReal(mock: MockScaleDependencies): ScalingDependencies {
		const real = <ScalingDependencies>{};
		const random = new Random();
		for (const [name, mockData] of pairs(mock)) real[name] = random.NextNumber(min(...mockData), max(...mockData));
		return real;
	}
	private scale(params: ScalingDependencies): ScalingParams {
		const upperMuscleRatio = getStatRatio("upperBodyMuscle", params.upperBodyMuscle);
		const lowerMuscleRatio = getStatRatio("lowerBodyMuscle", params.lowerBodyMuscle);
		const muscleRatio = (upperMuscleRatio + lowerMuscleRatio) / 2;
		const strengthScaledDamage = getStatRatio("strength", params.strength) * StatTuning.attack.damage.strength;
		const upperMuscleScaledDamage = upperMuscleRatio * StatTuning.attack.damage.upperBodyMuscle;
		const lowerMuscleScaledDamage = lowerMuscleRatio * StatTuning.attack.damage.lowerBodyMuscle;
		const muscleScaledStun = muscleRatio * StatTuning.attack.stun.muscleBonus;
		const fatScaledStun = getStatRatio("fat", params.fat) * StatTuning.attack.stun.fatBonus;
		const heightFactor = scaleStatValue("height", params.height, {
			maximum: StatTuning.cap.height,
		});
		const impulseSpeed =
			math.clamp(params.impulse / StatTuning.attack.speed.impulseCap, 0, 1) *
			StatTuning.attack.speed.impulseBonus;
		const agilitySpeed =
			math.clamp(params.agility / StatTuning.attack.speed.agilityCap, 0, 1) *
			StatTuning.attack.speed.agilityBonus;
		const muscleSpeedRatio = math.clamp(
			(params.upperBodyMuscle + params.lowerBodyMuscle) / (StatTuning.attack.speed.muscleCap * 2),
			0,
			1,
		);
		const muscleSpeedDebuff = muscleSpeedRatio * StatTuning.attack.speed.musclePenalty;

		const attackSpeed = math.clamp(
			StatTuning.attack.speed.base + impulseSpeed + agilitySpeed - muscleSpeedDebuff,
			StatTuning.attack.speed.minimum,
			StatTuning.attack.speed.maximum,
		);
		const size = {
			x: 0.6 + heightFactor,
			y: params.height,
			z: 0.6 + heightFactor,
		};

		const attack = {
			damage: 1 + sum(strengthScaledDamage, upperMuscleScaledDamage, lowerMuscleScaledDamage),
			speed: attackSpeed,
			stun: math.clamp(
				StatTuning.attack.stun.base + muscleScaledStun + fatScaledStun,
				StatTuning.attack.stun.minimum,
				StatTuning.attack.stun.maximum,
			),
		};
		return { size, attack };
	}
}
