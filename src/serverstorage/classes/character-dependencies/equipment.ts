import { InsertService } from "@rbxts/services";
import { $warn } from "rbxts-transform-debug";
import { INITIAL_DATA, type PlayerData, type PlayerDataKeys } from "shared/data-models/player-data";
import Log from "shared/log";
import type { CharacterDependency } from "shared/structs/linked-dependency";
import { Create } from "shared/utility/instance";
import { isString } from "shared/utility/t-isA";

export class EquipmentDependency implements CharacterDependency {
	public readonly priority: number = 3;
	public readonly changableKeys?: PlayerDataKeys[] = ["shirt", "pants"];
	async onWrite(_: Player, playerData: PlayerData, character: CharacterModel): Promise<void> {
		// this.removeInitialClothing(character);
		await this.set2d(character, playerData).catch((reason) =>
			Log.warn(`Failed to set 2D clothing for player ${character.Name}: ${reason}`),
		);
	}

	async onChanged(player: Player, playerData: PlayerData): Promise<void> {
		const character = <Maybe<CharacterModel>>player.Character;
		if (!character) return;
		return this.onWrite(player, playerData, character);
	}

	private async set2d(character: CharacterModel, playerData: PlayerData): Promise<void> {
		const shirt = this.formatId(await this.convert(this.getShirt(playerData), "ShirtTemplate"));
		const pants = this.formatId(await this.convert(this.getPants(playerData), "PantsTemplate"));
		const [instanceShirt, instancePants] = this.getCharacterClothesInstances(character);
		this.setShirt(instanceShirt, shirt);
		this.setPants(instancePants, pants);
	}

	private getShirt(playerData: PlayerData): number {
		return playerData.shirt ?? INITIAL_DATA.shirt;
	}

	private getPants(playerData: PlayerData): number {
		return playerData.pants ?? INITIAL_DATA.pants;
	}

	private setShirt(shirt: Shirt, id: string) {
		shirt.ShirtTemplate = id;
	}

	private setPants(pants: Pants, id: string) {
		pants.PantsTemplate = id;
	}

	private getCharacterClothesInstances(character: CharacterModel): [Shirt, Pants] {
		const shirt = character.FindFirstChildOfClass("Shirt") ?? Create("Shirt", "Shirt", character);
		const pants = character.FindFirstChildOfClass("Pants") ?? Create("Pants", "Pants", character);
		return <const>[shirt, pants];
	}

	private async convert(id: number, template: "ShirtTemplate" | "PantsTemplate" = "ShirtTemplate"): Promise<string> {
		const [success, response] = pcall(() => InsertService.LoadAsset(id));
		if (!success) {
			$warn(<string>response);
			return "0";
		}
		const clothing = <Shirt | Pants>response.GetChildren().shift();
		if (!clothing || !(template in clothing)) return "0";
		return (<Shirt>clothing)[<"ShirtTemplate">template];
	}

	private removeInitialClothing(character: CharacterModel) {
		for (const clothing of this.getCharacterClothesInstances(character)) clothing.Destroy();
	}

	private formatId(id: number | string): string {
		if (isString(id)) id = id.match("%d+")[0] ?? id.gsub("%D", "")[0];
		return `rbxassetid://${id}`;
	}
}
