import { Service, type OnInit } from "@flamework/core";
import Signal from "@rbxts/signal";
import { SuperJanitor } from "shared/classes/super-janitor";
import type { Regen } from "shared/components/regen";
import type { DataService } from "./third-party/data";
import type { PsuedoPlayerData } from "shared/data-models/player-data";
import { Players } from "@rbxts/services";
import type { GUIDService } from "./guid";
import type { ScalingService } from "./scaling";
import { getPercentOf } from "shared/utility/numbers";
const { abs } = math;
@Service()
export class StaminaService implements OnInit {
	private readonly staminaCache: Map<CharacterModel, Regen> = new Map();
	public readonly onStaminaRegenCreated: Signal<(character: CharacterModel, stamina: Regen) => void> = new Signal();
	public constructor(
		private readonly database: DataService,
		private readonly guid: GUIDService,
		private readonly scaling: ScalingService,
	) { }
	public async onInit(): Promise<void> {
		this.onStaminaRegenCreated.Connect((character, regen) => this.set(character, regen));
	}

	public heal(character: CharacterModel, amount: number): void {
		const regen = this.get(character);
		if (!regen) return;
		regen.set(regen.get() + amount);
	}

	public harm(character: CharacterModel, amount: number, percent: boolean = false, scale: boolean = true) {
		const regen = this.get(character);
		if (!regen) return;
		const data = this.data(character);
		let total = 0;
		total += percent ? getPercentOf(data.stamina, amount) : amount;
		if (scale) total += this.scaling.getStaminaAttack(data);
		regen.set(regen.get() - total);
	}

	public disable(character: CharacterModel, on: boolean, timeout?: number): void {
		const regen = this.get(character);
		if (!regen) return;
		if (timeout)
			SuperJanitor.set(`${character}Stamina_Disable`, () => regen.giveValues({ disableRegen: !on }), timeout);
		regen.giveValues({ disableRegen: on });
	}

	public setNegativeRegen(character: CharacterModel, regenAmount?: number): void {
		const regen = this.get(character);
		if (!regen) return;
		regenAmount ??= this.scaling.getRegen(this.data(character), "Stamina");
		regen.giveValues({ regenAmount: -abs(regenAmount) });
	}

	public setPositiveRegen(character: CharacterModel, regenAmount?: number): void {
		const regen = this.get(character);
		if (!regen) return;
		regenAmount ??= this.scaling.getRegen(this.data(character), "Stamina");
		regen.giveValues({ regenAmount: abs(regenAmount) });
	}

	private data(character: CharacterModel): PsuedoPlayerData {
		const player = <Maybe<Player>>Players.GetPlayerFromCharacter(character);
		return player ? this.database.get(player) : this.database.getPsuedo(this.guid.get(character));
	}

	private get(character: CharacterModel): Maybe<Regen> {
		return this.staminaCache.get(character);
	}

	private set(character: CharacterModel, stamina: Regen) {
		return this.staminaCache.set(character, stamina);
	}
}
