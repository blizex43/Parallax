import { Service } from "@flamework/core";
import { INITIAL_PSUEDO_DATA, PsuedoPlayerData } from "shared/data-models/player-data";
import type { Alias, PsuedoDefaultData } from "shared/structs/psuedo";
import psuedo from "shared/enums/default-psuedos-enum";
import Object from "@rbxts/object-utils";
import Log from "shared/log";
import type { DataService } from "./third-party/data";
import type { GUIDService } from "./guid";
import { EntityCreationProperties } from "shared/structs/npc";

@Service()
export class PsuedoService {
	private readonly psuedoCache: Map<CharacterModel, PsuedoDefaultData> = new Map();
	constructor(
		private readonly database: DataService,
		private readonly guid: GUIDService,
	) {}
	public allocate(properties: EntityCreationProperties): PsuedoDefaultData {
		const baseData = properties.statRange
			? this.getIteratedPsuedo(properties.statRange)
			: this.getIteratedPsuedo("default");
		if (!baseData) throw void Log.fatal(`Failed to generate NPC; Failed to get baseData`);
		return baseData;
	}

	public set(character: CharacterModel, data: PsuedoDefaultData): void {
		this.database.setPsuedo(this.guid.get(character), this.reconcileAllPsuedo(data));
		return void this.psuedoCache.set(character, data);
	}

	public get(character: CharacterModel): Maybe<PsuedoDefaultData> {
		return this.psuedoCache.get(character);
	}

	public del(character: CharacterModel): void {
		return void this.psuedoCache.delete(character);
	}

	private reconcileAllPsuedo(psuedo: Writable<Partial<PsuedoPlayerData>>): PsuedoPlayerData {
		for (const [statName, statValue] of pairs(INITIAL_PSUEDO_DATA))
			if (!(statName in psuedo)) psuedo[statName] = <never>statValue;
		return <PsuedoPlayerData>psuedo;
	}

	private fillPsuedo(fill: PsuedoDefaultData, stats: Partial<PsuedoPlayerData>): void {
		for (const [statName, statValue] of pairs(stats)) {
			(<Writable<PsuedoDefaultData>>fill)[<"agility">statName] = <never>statValue;
		}
	}

	private getIteratedPsuedo(alias: Alias): Maybe<PsuedoDefaultData> {
		for (const data of psuedo) {
			if (data.Alias === alias) return Object.deepCopy(data);
		}
		return;
	}
}
