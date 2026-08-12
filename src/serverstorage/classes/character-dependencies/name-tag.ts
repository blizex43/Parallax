import { GroupService } from "@rbxts/services";
import { $warn } from "rbxts-transform-debug";
import type { PlayerData, PlayerDataKeys } from "shared/data-models/player-data";
import type { ClanLiterals } from "shared/structs/info";
import { CharacterDependency } from "shared/structs/linked-dependency";
import { isString } from "shared/utility/t-isA";
interface NameTagDependencies {
	name: string;
	clan: ClanLiterals;
	lastname: string;
	group: number;
	title: string;
	titleEnabled: boolean;
}

export class NameTagDependency implements CharacterDependency {
	public readonly priority: number = 0;
	public readonly changableKeys: PlayerDataKeys[] = ["firstName", "clan", "customClan"];
	private readonly tries: number = 3;
	async onWrite(_: Player, playerData: PlayerData, character: CharacterModel): Promise<void> {
		const dependency = this.get(playerData);
		this.writeName(character.Humanoid, dependency);
		this.toggleView(character.Humanoid);
		//  IMPLEMENT LATER
		// 	const groupDouble = this.duplicateHumanoid(character.Humanoid);
		// try {
		// 	if (dependency.group !== 0) {
		// 		const groupName = await this.getGroup(dependency.group);
		// 		this.writeName(groupDouble, groupName);
		// 	} else {
		// 		this.toggleView(groupDouble, false);
		// 	}
		// 	const host = this.createHost("GroupHost", character);
		// 	const anchor = this.createAnchor(groupDouble, this.getFakeHead(character));
		// 	anchor.Parent = host;
		// 	groupDouble.Parent = host;
		// } catch (e) {
		// 	warn(e);
		// }
	}

	async onChanged(player: Player, playerData: PlayerData): Promise<void> {
		const character = <CharacterModel>player.Character;
		if (!character) return;
		const dependency = this.get(playerData);
		this.writeName(character.Humanoid, dependency);
	}

	private get(playerData: PlayerData): NameTagDependencies {
		return {
			name: playerData.firstName,
			clan: playerData.clan,
			lastname: playerData.customClan,
			title: playerData.title,
			titleEnabled: playerData.enableTitle,
			group: playerData.groupId,
		};
	}

	// private async getGroup(id: number): Promise<string> {
	// 	return new Promise<string>((resolve, reject) => {
	// 		for (const _ of $range(0, this.tries)) {
	// 			const group = GroupService.GetGroupInfoAsync(id);
	// 			if (group) {
	// 				resolve(group.Name);
	// 				return;
	// 			}
	// 			task.wait(0.1);
	// 		}
	// 		reject("Unable To Fetch Group ID");
	// 	}).catch((reason: string) => {
	// 		$warn(reason);
	// 		return "None";
	// 	});
	// }

	private writeName(humanoid: Humanoid, dependency: NameTagDependencies) {
		humanoid.DisplayName = isString(dependency)
			? dependency
			: `${dependency.name} ${dependency.title.size() > 0 && dependency.titleEnabled ? dependency.title + " " : ""}${dependency.clan === "None" ? dependency.lastname : dependency.clan}`;
	}

	private toggleView(humanoid: Humanoid, on: boolean = true) {
		const displayType = on ? Enum.HumanoidDisplayDistanceType.Subject : Enum.HumanoidDisplayDistanceType.None;
		humanoid.DisplayDistanceType = displayType;
	}

	// private duplicateHumanoid<T extends Humanoid = Humanoid>(humanoid: T, parent: boolean = false): T {
	// 	const double = humanoid.Clone();
	// 	if (parent) double.Parent = humanoid.Parent;
	// 	double.Name = "Duplicated";
	// 	return double;
	// }

	// private getFakeHead(character: CharacterModel): BasePart {
	// 	return character.WaitForChild<BasePart>("FakeHead");
	// }

	// private createAnchor(humanoid: Humanoid, fakeHead: BasePart) {
	// 	const anchor = Create("Part", "Head", humanoid.Parent);
	// 	anchor.Transparency = 0;
	// 	anchor.Massless = true;
	// 	anchor.Size = new Vector3(2, 2, 2);
	// 	const weld = Create("Weld", "AnchorWeld", anchor);
	// 	weld.Part0 = anchor;
	// 	weld.Part1 = fakeHead;
	// 	return anchor;
	// }

	// private createHost(name: string, parent: Instance): Model {
	// 	return Create("Model", name, parent);
	// }
}
