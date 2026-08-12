import { Service, type OnInit } from "@flamework/core";
import { Lazy } from "@rbxts/lazy";
import { LinkRemote } from "serverstorage/decorators";
import { Events } from "serverstorage/network";
import type { OnCharacterAdd } from "shared/hooks";
import { $warn } from "rbxts-transform-debug";
import type { PlayerService } from "./player";
import { HairDependency } from "serverstorage/classes/character-dependencies/hair";
import { AccessoryDependency } from "serverstorage/classes/character-dependencies/accessory";
import LazyIterator from "@rbxts/lazy-iterator";
import type { DataService } from "./third-party/data";
import type { PlayerData, PlayerDataKeys } from "shared/data-models/player-data";
import { ScaleDependency } from "serverstorage/classes/character-dependencies/scale";
import { Delay, SpawnTask } from "shared/decorators";
import { NameTagDependency } from "serverstorage/classes/character-dependencies/name-tag";
import { EquipmentDependency } from "serverstorage/classes/character-dependencies/equipment";
import { CollisionDependency } from "serverstorage/classes/character-dependencies/collision";
import { isBasePart, isHumanoid } from "shared/utility/t-isA";
import Signal from "@rbxts/signal";
interface CharacterDependencies {
	readonly hair: HairDependency;
	readonly accessory: AccessoryDependency;
	readonly equipment: EquipmentDependency;
	readonly scale: ScaleDependency;
	readonly nametag: NameTagDependency;
	readonly collision: CollisionDependency;
}
@Service()
export class CharacterService implements OnInit, OnCharacterAdd {
	public readonly onCharacterDataLoad: Signal<(character: CharacterModel) => void> = new Signal();
	private readonly dependencies: Lazy<CharacterDependencies> = new Lazy(() => ({
		hair: new HairDependency(),
		accessory: new AccessoryDependency(),
		equipment: new EquipmentDependency(),
		scale: new ScaleDependency(),
		nametag: new NameTagDependency(),
		collision: new CollisionDependency(),
	}));
	constructor(
		private readonly playerService: PlayerService,
		private readonly database: DataService,
	) {}
	public onInit(): void {
		Events.character.toggleDefaultMovement.connect((player, on) => this.toggleDefaultMovement(player, on));
		this.dependencyDataListener();
	}

	@Delay(0.15)
	@SpawnTask()
	public async onCharacterAdd(character: CharacterModel): Promise<void> {
		const player = this.playerService.get(character);
		if (!player) return;
		const playerData = await this.database.forceGet(player);
		try {
			const dependencies = <CharacterDependencies>await this.get(true);
			const dependIterator = LazyIterator.fromValues(
				<Record<keyof CharacterDependencies, CharacterDependencies[keyof CharacterDependencies]>>dependencies,
			).sort((dependencies, nextDependencies) => dependencies.priority > nextDependencies.priority);
			for (const dependency of dependIterator.collect())
				if ("onWrite" in dependency) await dependency.onWrite(player, playerData, character);
			this.onCharacterDataLoad.Fire(character);
		} catch (e) {
			$warn(e);
			this.playerService.kickPlayer(player);
		}
	}

	@LinkRemote(Events.character.toggleDefaultMovement)
	public toggleDefaultMovement(player: Player, on: boolean): void {
		player.DevComputerMovementMode = on
			? Enum.DevComputerMovementMode.KeyboardMouse
			: Enum.DevComputerMovementMode.Scriptable;
		player.DevTouchMovementMode = on
			? Enum.DevTouchMovementMode.DynamicThumbstick
			: Enum.DevTouchMovementMode.Scriptable;
	}

	public getRootPart(character: CharacterModel, force: boolean = false): Maybe<RootPart> {
		const call = force ? "WaitForChild" : "FindFirstChild";
		const root = character[call]("HumanoidRootPart");
		if (root && isBasePart(root)) return <RootPart>root;
		return;
	}

	public getHumanoid(character: CharacterModel, force: boolean = false): Maybe<Humanoid> {
		const call = force ? "WaitForChild" : "FindFirstChild";
		const humanoid = character[call]("Humanoid");
		if (humanoid && isHumanoid(humanoid)) return humanoid;
		return;
	}

	public getTorso(character: CharacterModel, force: boolean = false): Maybe<BasePart> {
		const call = force ? "WaitForChild" : "FindFirstChild";
		const torso = character[call]("Torso");
		if (torso && isBasePart(torso)) return torso;
		return;
	}

	private async dependencyDataListener() {
		const dependencies = <CharacterDependencies>await this.get(true);
		const dependIterator = LazyIterator.fromValues(
			<Record<keyof CharacterDependencies, CharacterDependencies[keyof CharacterDependencies]>>dependencies,
		).sort((dependencies, nextDependencies) => {
			return dependencies.priority > nextDependencies.priority;
		});
		const staticDependencies = dependIterator.collect();
		this.database.updated.Connect(async (player: Player, data: PlayerData, keys: PlayerDataKeys[]) => {
			for (const dependency of staticDependencies) {
				if (
					"onChanged" in dependency &&
					"changableKeys" in dependency &&
					keys.some((key) => dependency.changableKeys!.includes(key))
				)
					await dependency.onChanged(player, data);
			}
		});
	}

	private async get(tryGet: boolean = false): Promise<CharacterDependencies> {
		return tryGet
			? (<{ success: boolean; value: CharacterDependencies }>this.dependencies.tryGetValue()).value
			: this.dependencies.getValue();
	}
}
