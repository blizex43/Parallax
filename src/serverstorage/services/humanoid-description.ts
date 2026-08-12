import { Players } from "@rbxts/services";
import { $warn } from "rbxts-transform-debug";
import { Create } from "shared/utility/instance";

export class HumanoidDescriptionService {
	private readonly tryCount = 3;
	constructor() {}
	/* ----------------------------- PROFILE FETCH ----------------------------- */

	public async getCharacterProfile(
		player: Player,
		character: CharacterModel,
		apiFirst: boolean = true,
		parent = true,
	): Promise<HumanoidDescription> {
		const humanoid = character.Humanoid;

		// eslint-disable-next-line no-async-promise-executor
		return new Promise<HumanoidDescription>(async (resolve, reject) => {
			let description: Maybe<HumanoidDescription>;

			for (const _ of $range(0, this.tryCount)) {
				description = apiFirst ? await this.marketGetProfile(player) : this.gameGetProfile(character, parent);
				if (description) break;
			}

			if (description) {
				if (parent) description.Parent = humanoid;
				resolve(description);
				return;
			}

			reject("Unable To Fetch Description From Api");
		}).catch(async (err: string) => {
			$warn(err);

			return apiFirst ? this.gameGetProfile(character, parent) : (await this.marketGetProfile(player))!;
		});
	}

	private async marketGetProfile(player: Player): Promise<Maybe<HumanoidDescription>> {
		return Players.GetHumanoidDescriptionFromUserIdAsync(player.UserId);
	}

	private gameGetProfile(character: CharacterModel, parent: boolean): HumanoidDescription {
		const humanoid = character.Humanoid;
		return (
			humanoid.FindFirstChildOfClass("HumanoidDescription") ??
			Create("HumanoidDescription", undefined, parent ? humanoid : undefined)
		);
	}
}
