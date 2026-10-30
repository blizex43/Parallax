import { OnTick, Service, type OnInit } from "@flamework/core";
import { RunService } from "@rbxts/services";
import type { DamageTree } from "shared/structs/damage";
import type { AnomalyLiterals, HitData } from "shared/structs/attack";
import type { PsuedoPlayerData } from "shared/data-models/player-data";
import type { AnomalySnapshot } from "shared/structs/anomaly";
import { AnomalyAttributes, AnomalyTuning } from "shared/enums/anomaly-enum";
import { getMasteryBuildupMultiplier, getProcDamageMultiplier } from "shared/utility/anomaly-scaling";
import { AnomalyArray } from "shared/enums/combat-enum";

interface AnomalyRuntimeState {
	buildup: Record<AnomalyLiterals, number>;
	adaptationStacks: number;
	electricStunExpiresAt: number;
	physicalAssaultPending: boolean;
	lastCombatAt: number;
	attributeUpdateAt: number;
	destroyingConnection: RBXScriptConnection;
}

@Service()
export class AnomalyService implements OnTick {
	private readonly states = new Map<CharacterModel, AnomalyRuntimeState>();

	public onTick(dt: number): void {
		this.update(dt);
	}

	public processHit(context: HitData, attackedData: PsuedoPlayerData, tree: DamageTree): void {
		if (tree.iframed || tree.clashed) return;

		const now = os.clock();
		const attacker = context.attacker.character;
		const attacked = context.attacked.character;
		const attackerState = this.getOrCreateState(attacker);
		const attackedState = this.getOrCreateState(attacked);
		attackerState.lastCombatAt = now;
		attackedState.lastCombatAt = now;

		if (!tree.blocked || tree.blockBroken) {
			for (const anomaly of context.properties.anomaly ?? []) {
				if (
					!anomaly.allowOffElementBuild &&
					(!context.attacker.isSkill || context.properties.element !== anomaly.type)
				)
					continue;

				const buildup = anomaly.potency * getMasteryBuildupMultiplier(context.attacker.data);
				this.addBuildup(attackedState, anomaly.type, buildup);
			}

			const anomalyType = context.properties.element;
			if (context.attacker.isSkill && anomalyType && anomalyType !== "Adaptation")
				this.procIfReady(attackerState, attackedState, anomalyType, context, tree, now);
		}

		const adaptationBuildup = AnomalyTuning.adaptationBuildupPerHit * getMasteryBuildupMultiplier(attackedData);
		this.addBuildup(attackedState, "Adaptation", adaptationBuildup);
		this.publish(attacker, attackerState);
		this.publish(attacked, attackedState);
	}

	public consumePhysicalAssault(character: CharacterModel, data: PsuedoPlayerData): Maybe<number> {
		const state = this.states.get(character);
		if (!state?.physicalAssaultPending) return;
		state.physicalAssaultPending = false;
		this.publish(character, state);
		return (
			1 + AnomalyTuning.physical.assaultDamageMultiplier * getProcDamageMultiplier(data, "Physical", data.style)
		);
	}

	public getIncomingDamageMultiplier(character: CharacterModel): number {
		const stacks = this.states.get(character)?.adaptationStacks ?? 0;
		return 1 - stacks * AnomalyTuning.adaptationDamageReductionPerStack;
	}

	public getOutgoingStunMultiplier(character: CharacterModel): number {
		const state = this.states.get(character);
		return state && state.electricStunExpiresAt > os.clock() ? AnomalyTuning.electric.stunMultiplier : 1;
	}

	public getSnapshot(character: CharacterModel): AnomalySnapshot {
		const state = this.getOrCreateState(character);
		return {
			electric: state.buildup.Electric,
			physical: state.buildup.Physical,
			adaptation: state.buildup.Adaptation,
			adaptationStacks: state.adaptationStacks,
			physicalAssaultReady: state.physicalAssaultPending,
			electricStunExpiresAt: state.electricStunExpiresAt,
		};
	}

	private update(deltaTime: number): void {
		const now = os.clock();
		for (const [character, state] of this.states) {
			if (!character.IsDescendantOf(game)) {
				state.destroyingConnection.Disconnect();
				this.states.delete(character);
				continue;
			}

			if (state.electricStunExpiresAt > 0 && state.electricStunExpiresAt <= now) {
				state.electricStunExpiresAt = 0;
				this.publish(character, state);
			}

			if (now - state.lastCombatAt < AnomalyTuning.outOfCombatGracePeriod) continue;

			let changed = false;
			for (const anomalyType of AnomalyArray) {
				const previous = state.buildup[anomalyType];
				state.buildup[anomalyType] = math.max(
					0,
					previous - AnomalyTuning.outOfCombatDecayPerSecond * deltaTime,
				);
				changed ||= previous !== state.buildup[anomalyType];
			}
			state.attributeUpdateAt += deltaTime;
			if (changed && state.attributeUpdateAt >= AnomalyTuning.attributeUpdateInterval) {
				state.attributeUpdateAt = 0;
				this.publish(character, state);
			}
		}
	}

	private addBuildup(state: AnomalyRuntimeState, anomalyType: AnomalyLiterals, amount: number): void {
		const total = state.buildup[anomalyType] + amount;
		if (anomalyType === "Adaptation" && total >= AnomalyTuning.maximumBuildup) {
			state.buildup.Adaptation = 0;
			state.adaptationStacks = math.min(
				AnomalyTuning.adaptationMaximumStacks,
				state.adaptationStacks + AnomalyTuning.adaptationStacksPerProc,
			);
			return;
		}

		state.buildup[anomalyType] = math.min(AnomalyTuning.maximumBuildup, total);
	}

	private procIfReady(
		attackerState: AnomalyRuntimeState,
		attackedState: AnomalyRuntimeState,
		anomalyType: Exclude<AnomalyLiterals, "Adaptation">,
		context: HitData,
		tree: DamageTree,
		now: number,
	): void {
		if (attackedState.buildup[anomalyType] < AnomalyTuning.maximumBuildup) return;
		attackedState.buildup[anomalyType] = 0;

		switch (anomalyType) {
			case "Electric":
				attackerState.electricStunExpiresAt = now + AnomalyTuning.electric.stunDuration;
				tree.damage +=
					context.properties.damage *
					AnomalyTuning.electric.procDamageMultiplier *
					getProcDamageMultiplier(context.attacker.data, "Electric", context.attacker.data.style) *
					this.getIncomingDamageMultiplier(context.attacked.character);
				break;
			case "Physical":
				attackerState.physicalAssaultPending = true;
				break;
		}
	}

	private getOrCreateState(character: CharacterModel): AnomalyRuntimeState {
		let state = this.states.get(character);
		if (state) return state;

		state = {
			buildup: {
				Electric: 0,
				Physical: 0,
				Adaptation: 0,
			},
			adaptationStacks: 0,
			electricStunExpiresAt: 0,
			physicalAssaultPending: false,
			lastCombatAt: os.clock(),
			attributeUpdateAt: 0,
			destroyingConnection: character.Destroying.Connect(() => this.states.delete(character)),
		};
		this.states.set(character, state);
		this.publish(character, state);
		return state;
	}

	private publish(character: CharacterModel, state: AnomalyRuntimeState): void {
		character.SetAttribute(AnomalyAttributes.ElectricBuildup, state.buildup.Electric);
		character.SetAttribute(AnomalyAttributes.PhysicalBuildup, state.buildup.Physical);
		character.SetAttribute(AnomalyAttributes.AdaptationBuildup, state.buildup.Adaptation);
		character.SetAttribute(AnomalyAttributes.AdaptationStacks, state.adaptationStacks);
		character.SetAttribute(AnomalyAttributes.PhysicalAssaultReady, state.physicalAssaultPending);
		character.SetAttribute(AnomalyAttributes.ElectricStunExpiresAt, state.electricStunExpiresAt);
		character.SetAttribute(AnomalyAttributes.ElectricStunActive, state.electricStunExpiresAt > os.clock());
	}
}
