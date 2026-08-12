/* eslint-disable @typescript-eslint/no-duplicate-enum-values */
export const RegenPropertiesEnum = {
	disabled: false,
	disableRegen: false,
	regenRate: 1,
	regenAmount: 1,
	max: 0,
	min: 0,
};

export const RegenInstanceEnum = <const>{
	Value: RegenPropertiesEnum.max,
};

export const enum RegenProperties {
	SprintStaminaPerTick = 10,
	RagdollHealth = 0.0011,
	LowestHealthPossible = 0.001,
	BaseHealth = 100,
	BaseStamina = 100,
	RegenCombatHPS = 0.3,
	HealthPerTick = 1.5,
	HealthTickInterval = 1,
	HealthPerTickInCombat = 0.2,
	StaminaPerTick = 5,
	StaminaTickInterval = 0.1,
	StaminaPerTickInCombat = 2.5,
	SprintStaminaTickMultiplier = 2,
	NegativeStaminaTimeAllowed = 3.5,
}
