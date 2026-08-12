import Object from "@rbxts/object-utils";
import { RerollSignal } from "shared/constants";
import { OnSignalSubscribed } from "shared/decorators";
import { Clans, EyeColors, Eyes, HairColors, Heights, Mouths, Noses, Traits } from "shared/enums/info-enum";
import type {
	AcceptableRarityValue,
	FinishedRarityValue,
	RarityTree,
	RarityType,
	RollOptions,
	RollType,
} from "shared/structs/info";
import { decapitalize } from "shared/utility/strings";
import RandomPicker from "@rbxts/weighted-random-picker/index";
import type { PlayerData } from "shared/data-models/player-data";
import { isArray, isNumber, isString } from "shared/utility/t-isA";
import Color from "@rbxts/color";
const { random } = math;
export class RerollService {
	private readonly indexible = <const>{
		Clan: Clans,
		HairColor: HairColors,
		Height: Heights,
		EyeColor: EyeColors,
		Trait: Traits,
		Eyes: Eyes,
		Mouth: Mouths,
		Nose: Noses,
	};
	@OnSignalSubscribed(RerollSignal)
	public remoteReroll(playerData: Writable<PlayerData>, rollType: RollType, options: RollOptions): void {
		const dataName = decapitalize(rollType);
		if (!(rollType in this.indexible) || !(dataName in playerData)) return;
		const rollSector = <RarityTree>(<unknown>Object.deepCopy(this.indexible[rollType]));
		if (options.exclude) this.subtractRarity(rollSector, options.exclude);
		const rerolled = this.getRandom(rollSector);
		if (rerolled.value === "Randomized") rerolled.value = this.getRandomColor();
		playerData[<"clan">dataName] = <never>rerolled.value;
	}
	private getRandom(rarityTree: RarityTree): { rarity: RarityType; value: FinishedRarityValue } {
		const rarity = this.getRateSlot(rarityTree);
		const child = rarityTree[rarity];

		if (isArray(isString)(child.value)) {
			const reroller = new RandomPicker(child.value);
			return {
				rarity,
				value: reroller(),
			};
		} else if (isArray(isNumber)(child.value)) {
			return {
				rarity,
				value:
					child.type === "Random"
						? new Random().NextNumber(child.value[0], child.value[1])
						: new RandomPicker(<number[]>child.value)(),
			};
		}
		return {
			rarity,
			value: child.value,
		};
	}

	private getRandomColor(): Color3 {
		return Color3.fromRGB(random(1, 255), random(1, 255), random(1, 255));
	}

	private getRateSlot(rarityTree: RarityTree): RarityType {
		const picked = new RandomPicker(
			Object.keys(rarityTree),
			Object.values(rarityTree).map((data) => data.weight),
		)();
		return picked;
	}
	// private getValue(tree: RarityTree) {
	// 	const rates = this.getRates(tree);
	// 	let totalWeight = 0;
	// 	const rarityWeights = new Array<[string, number]>();

	// 	for (const [rarity, weight] of pairs(<Record<string, number>>rates)) {
	// 		if (rarity in tree) {
	// 			totalWeight += weight;
	// 			rarityWeights.push([rarity, totalWeight]);
	// 		}
	// 	}

	// 	if (totalWeight <= 0 || rarityWeights.size() === 0) return undefined;

	// 	const roll = math.random() * totalWeight;
	// 	let selectedRarity = rarityWeights[rarityWeights.size() - 1][0];

	// 	for (const [rarity, cumulativeWeight] of rarityWeights) {
	// 		if (roll <= cumulativeWeight) {
	// 			selectedRarity = rarity;
	// 			break;
	// 		}
	// 	}

	// 	const selectedValue = <unknown>tree[<never>selectedRarity];
	// 	if (!t.table(selectedValue)) return selectedValue;

	// 	const valuePool = <unknown[]>selectedValue;
	// 	if (valuePool.isEmpty()) return undefined;

	// 	if (valuePool.size() === 2 && t.number(valuePool[0]) && t.number(valuePool[1])) {
	// 		const min = valuePool[0];
	// 		const max = valuePool[1];
	// 		return min + math.random() * (max - min);
	// 	}

	// 	return getRandomArrayValue(valuePool);
	// }

	// private getRates(tree: RarityTree) {
	// 	if ("Green" in tree || "Blue" in tree) return EyeColorRates;
	// 	if ("Blonde" in tree || "Orange" in tree) return HairRates;
	// 	if ("Mythic" in tree) return ClanRates;

	// 	const common = (tree as Record<string, unknown>).Common;
	// 	if (typeIs(common, "table")) {
	// 		const commonValues = common as unknown[];
	// 		if (commonValues.size() === 2 && typeIs(commonValues[0], "number") && typeIs(commonValues[1], "number")) {
	// 			return HeightRates;
	// 		}

	// 		if (commonValues.size() > 6) return ClanRates;
	// 	}

	// 	return TraitRates;
	// }

	private subtractRarity(tree: RarityTree, excludes: RarityType[]) {
		for (const rarity of excludes) {
			if (rarity in tree) delete tree[<never>rarity];
		}
	}
}
