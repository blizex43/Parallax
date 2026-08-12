import { Dependency, type OnStart } from "@flamework/core";
import { Component, Components } from "@flamework/components";
import { $nameof } from "rbxts-transform-debug";
import { HumanoidInstanceEnum, HumanoidProperties, HumanoidStates } from "shared/enums/humanoid-enum";
import InstanceExtendable from "shared/base-components/instance";
import type { DataService } from "serverstorage/services/third-party/data";
import { Players } from "@rbxts/services";
import type { GUIDService } from "serverstorage/services/guid";
import type { ScalingService } from "serverstorage/services/scaling";
import type { PsuedoPlayerData } from "shared/data-models/player-data";
import { SuperJanitor } from "shared/classes/super-janitor";
import type { WebsocketManagementService } from "serverstorage/services/websocket-manager";
import { CombatState, VitalityState } from "shared/enums/config-enum";
import { isBetween, isNegative } from "shared/utility/numbers";
import { Regen } from "shared/components/regen";
import { RegenProperties } from "shared/enums/regen-enum";
import type { StaminaService } from "serverstorage/services/stamina";
import { now } from "shared/utility/time";
type Attributes = typeof HumanoidInstanceEnum;
@Component({ tag: $nameof<Humanoid>(), defaults: HumanoidInstanceEnum })
export class Humanoid extends InstanceExtendable<Attributes, HumanoidInstance> implements OnStart {
	public lastPositiveStamina = 0;
	public readonly dead: boolean = false;
	private readonly regens = {
		Health: Regen.create(), // 1,
		Stamina: Regen.create(), // 0.1,
	};
	constructor(
		private readonly database: DataService,
		private readonly scale: ScalingService,
		private readonly guid: GUIDService,
		private readonly ws: WebsocketManagementService,
		private readonly stamina: StaminaService,
	) {
		super();
	}

	public onStart(): void {
		super.onStart();
		this.onDeath();
		this.initProperties();
		this.initStates();
		this.initRegens();
		this.update();
	}

	public update() {
		this.updateMaxHealth();
		this.updateMaxStamina();
		this.updateRegen("Health");
		this.updateRegen("Stamina");
	}

	public updateRegen(regenName: "Health" | "Stamina") {
		const data = this.data();
		const regen = this.scale.getRegen(data, regenName);
		const combatTag = this.ws.getStateValue<boolean>(this.instance.Parent, CombatState.CombatTag);
		if (combatTag && regenName === "Health") this.regens[regenName].disableRegen();
		else if (!combatTag && regenName === "Health") this.regens[regenName].enableRegen();
		this.regens[regenName].giveValues({ regenAmount: regen });
	}

	public onDeath() {
		const combatTag = this.ws.getCharm<boolean>(this.instance.Parent, CombatState.CombatTag)!;
		this.addToCleanup(
			combatTag.changed.Connect(() => this.update()),
			this.instance.Died.Once(() => {
				(<Writable<Humanoid>>this).dead = true;
				this.onDestroy();
			}),

			this.instance.HealthChanged.Connect((health) => {
				this.regens.Health.set(health);
				if (isBetween(health, 0, RegenProperties.RagdollHealth) && !this.dead)
					this.ws.setStateFor(this.instance.Parent, CombatState.Knocked, true, 20, false, true);
			}),
			() => {
				for (const [, regen] of pairs(this.regens)) regen.release();
			},
			this.regens.Health.instance.GetPropertyChangedSignal("Value").Connect(() => {
				this.instance.Health = this.regens.Health.get();
				return this.ws.setState(this.instance.Parent, VitalityState.Health, this.instance.Health);
			}),
			this.regens.Stamina.instance.GetPropertyChangedSignal("Value").Connect(() => {
				const current = this.regens.Stamina.get();
				if (
					isNegative(current) &&
					!this.ws.getStateValue(this.instance.Parent, CombatState.Knocked) &&
					!this.ws.getStateValue(this.instance.Parent, CombatState.Exhausted)
				) {
					const cachedTime = this.lastPositiveStamina;
					SuperJanitor.set(
						`${this.instance}Stamina_Fall_Threshhold`,
						() =>
							this.lastPositiveStamina === cachedTime &&
							now(true) - cachedTime > RegenProperties.NegativeStaminaTimeAllowed &&
							this.ws.setStateFor(this.instance.Parent, CombatState.Exhausted, true, 20, false, true),
						RegenProperties.NegativeStaminaTimeAllowed,
					);
				} else {
					this.lastPositiveStamina = now(true);
					SuperJanitor.del(`${this.instance}Stamina_Fall_Threshhold`);
				}
				return this.ws.setState(this.instance.Parent, VitalityState.Stamina, current);
			}),
		);
	}

	public updateMaxHealth(): number {
		const data = this.data();
		const health = this.regens.Health.get();
		const oldMax = this.regens.Health.getMax();
		const max = this.scale.getMax(data, "Health");
		this.instance.MaxHealth = max;
		this.regens.Health.giveValues({
			max,
		});
		if (health === oldMax) this.regens.Health.set(max);
		return max;
	}

	public updateMaxStamina(): number {
		const data = this.data();
		const stamina = this.regens.Stamina.get();
		const oldMax = this.regens.Stamina.getMax();
		const max = this.scale.getMax(data, "Stamina");
		this.regens.Stamina.giveValues({
			max,
		});
		if (stamina === oldMax) this.regens.Stamina.set(max);
		return max;
	}

	public disableHealthRegen(duration: number): void {
		SuperJanitor.del(`${this.instance.Name}_Health`);
		SuperJanitor.set(`${this.instance.Name}_Health`, () => this.regens.Health.enable(), duration);
		this.regens.Health.disable();
	}

	public initStates(): void {
		for (const [name, value] of pairs(HumanoidStates)) this.instance.SetStateEnabled(name, value);
	}

	public initProperties(): void {
		for (const [name, value] of pairs(HumanoidProperties)) this.instance[name] = <never>value;
	}

	public initRegens(): void {
		this.regens.Health.giveValues(
			{
				disabled: false,
				min: 0,
				max: this.updateMaxHealth(),
				regenRate: RegenProperties.HealthTickInterval,
			},
			true,
		);
		this.regens.Stamina.giveValues(
			{
				disabled: false,
				min: -10000,
				max: this.updateMaxStamina(),
				regenRate: RegenProperties.StaminaTickInterval,
			},
			true,
		);
		if (!Players.GetPlayerFromCharacter(this.instance.Parent)) {
			this.regens.Stamina.disable();
		}
		this.stamina.onStaminaRegenCreated.Fire(this.instance.Parent, this.regens.Stamina);
		return;
	}

	public data(): PsuedoPlayerData {
		const player = <Maybe<Player>>Players.GetPlayerFromCharacter(this.instance.Parent);
		return player ? this.database.get(player) : this.database.getPsuedo(this.guid.get(this.instance.Parent));
	}

	public static create(character: CharacterModel): Humanoid {
		const humanoid = character.Humanoid;
		const dependency = Dependency<Components>();
		return dependency.addComponent(humanoid);
	}
}
