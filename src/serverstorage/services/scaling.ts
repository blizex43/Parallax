import {
	BaseDensity,
	BuffPerStat,
	DebuffIncrementPerStat,
	IncrementPerStat,
	MaxStatsScaled,
	MockScaleClassDependencies,
	StaminaDashIncrementPerStat,
	StaminaSprintIncrementPerStat,
	StunIncrementPerStat,
} from "shared/enums/scale-enum";
import type { DataService } from "./third-party/data";
import type {
	MakeshiftParams,
	MockScaleDependencies,
	ScaleClass,
	ScalingDependencies,
	ScalingParams,
} from "shared/structs/scale";
import { getPercentOf, scaleNumberWithPer, sum } from "shared/utility/numbers";
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
		const agilityDebuff = scaleNumberWithPer(
			data.agility,
			BuffPerStat.agility,
			StaminaSprintIncrementPerStat.agility,
			undefined,
			MaxStatsScaled.agility,
		);
		const upperMuscleDebuff = scaleNumberWithPer(
			data.upperBodyMuscle,
			BuffPerStat.upperBodyMuscle,
			StaminaSprintIncrementPerStat.upperBodyMuscle,
			undefined,
			MaxStatsScaled.upperBodyMuscle,
		);
		const lowerMuscleDebuff = scaleNumberWithPer(
			data.lowerBodyMuscle,
			BuffPerStat.lowerBodyMuscle,
			StaminaSprintIncrementPerStat.lowerBodyMuscle,
			undefined,
			MaxStatsScaled.lowerBodyMuscle,
		);
		return sum(totalRegen, agilityDebuff, upperMuscleDebuff, lowerMuscleDebuff);
	}

	public getStaminaSprintRegen(data: PsuedoPlayerData): number {
		return this.getStaminaAttack(data) * RegenProperties.StaminaTickInterval;
	}

	public getDashStaminaTake(data: PsuedoPlayerData): number {
		const maxStamina = this.getMax(data, "Stamina");

		const upperMuscleDebuff = scaleNumberWithPer(
			data.upperBodyMuscle,
			BuffPerStat.upperBodyMuscle,
			StaminaDashIncrementPerStat.upperBodyMuscle,
			BaseDensity.Muscle,
			MaxStatsScaled.upperBodyMuscle,
		);
		const lowerMuscleDebuff = scaleNumberWithPer(
			data.lowerBodyMuscle,
			BuffPerStat.lowerBodyMuscle,
			StaminaDashIncrementPerStat.lowerBodyMuscle,
			BaseDensity.Muscle,
			MaxStatsScaled.lowerBodyMuscle,
		);

		const fatDebuff = scaleNumberWithPer(
			data.fat,
			BuffPerStat.fat,
			StaminaDashIncrementPerStat.fat,
			BaseDensity.Fat,
			MaxStatsScaled.fat,
		);

		const totalDashAmount = getPercentOf(
			maxStamina,
			sum(DashProperties.Percent, upperMuscleDebuff + lowerMuscleDebuff + fatDebuff),
		);
		return totalDashAmount;
	}

	public getMax(data: PsuedoPlayerData, kind: "Health" | "Stamina" = "Health"): number {
		const dataKind = kind === "Health" ? "vigor" : "stamina";
		const baseScaleKind = kind === "Health" ? RegenProperties.BaseHealth : RegenProperties.BaseStamina;
		return scaleNumberWithPer(
			data[dataKind],
			BuffPerStat[dataKind],
			IncrementPerStat[dataKind],
			0,
			MaxStatsScaled[dataKind],
			true,
			baseScaleKind,
		);
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
		const totalMuscle = sum(params.upperBodyMuscle, params.lowerBodyMuscle);
		const isTrueMuscle = totalMuscle > 500;
		const strengthScaledDamage = scaleNumberWithPer(
			params.strength,
			BuffPerStat.strength,
			IncrementPerStat.strength,
			undefined,
			MaxStatsScaled.strength,
		);

		const upperMuscleScaledDamage = scaleNumberWithPer(
			params.upperBodyMuscle,
			BuffPerStat.upperBodyMuscle,
			IncrementPerStat.upperBodyMuscle,
			undefined,
			MaxStatsScaled.upperBodyMuscle,
		);

		const lowerMuscleScaledDamage = scaleNumberWithPer(
			params.lowerBodyMuscle,
			BuffPerStat.lowerBodyMuscle,
			IncrementPerStat.lowerBodyMuscle,
			undefined,
			MaxStatsScaled.lowerBodyMuscle,
		);

		const muscleScaledStun = scaleNumberWithPer(
			params.upperBodyMuscle + params.lowerBodyMuscle,
			BuffPerStat.upperBodyMuscle + BuffPerStat.lowerBodyMuscle,
			StunIncrementPerStat.upperBodyMuscle! + StunIncrementPerStat.lowerBodyMuscle!,
			BaseDensity.Muscle * 2,
			1750,
			false,
		);

		const fatScaledStun = scaleNumberWithPer(
			params.fat,
			BuffPerStat.fat,
			StunIncrementPerStat.fat!,
			BaseDensity.Fat,
			400,
			false,
		);

		const heightFactor = scaleNumberWithPer(
			params.height,
			BuffPerStat.height,
			IncrementPerStat.height,
			undefined,
			MaxStatsScaled.height,
		);
		const baseMuscleSpeedDebuff = scaleNumberWithPer(
			totalMuscle,
			BuffPerStat.upperBodyMuscle + BuffPerStat.lowerBodyMuscle,
			DebuffIncrementPerStat.upperBodyMuscle! + DebuffIncrementPerStat.lowerBodyMuscle!,
			BaseDensity.Muscle * 2,
			3500,
			false,
		);
		const baseImpulse = !isTrueMuscle
			? scaleNumberWithPer(
					params.impulse,
					BuffPerStat.impulse,
					IncrementPerStat.impulse,
					0,
					MaxStatsScaled.impulse,
				)
			: scaleNumberWithPer(params.impulse, BuffPerStat.impulse, IncrementPerStat.impulse * 3, 0, 400);

		const attackSpeed = math.clamp(1 + baseImpulse - baseMuscleSpeedDebuff, 0.35, isTrueMuscle ? 0.9 : 2);
		const size = {
			x: 0.6 + heightFactor,
			y: params.height,
			z: 0.6 + heightFactor,
		};

		const attack = {
			damage: 1 + sum(strengthScaledDamage, upperMuscleScaledDamage, lowerMuscleScaledDamage),
			speed: attackSpeed,
			stun: math.max(0.9 + muscleScaledStun + fatScaledStun, 0.9),
		};
		return { size, attack };
	}
}
