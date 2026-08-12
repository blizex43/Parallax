import { OnInit, Service } from "@flamework/core";
import { Players } from "@rbxts/services";
import type { PlayerData } from "shared/data-models/player-data";
import { DataService } from "./third-party/data";
import { OnDataLoad } from "serverstorage/hooks";
import { NewDependency } from "serverstorage/classes/player-dependencies/new";
import { Lazy } from "@rbxts/lazy";
import { $print, $warn } from "rbxts-transform-debug";
import { SpawnTask } from "shared/decorators";
import LazyIterator from "@rbxts/lazy-iterator";
import { LogStart } from "shared/hooks";
interface PlayerDependencies {
	new: NewDependency;
}
@Service()
export class PlayerService implements OnDataLoad, OnInit, LogStart {
	private readonly dependencies: Lazy<PlayerDependencies> = new Lazy(() => ({
		new: new NewDependency(),
	}));
	constructor(private readonly database: DataService) {}
	onInit(): void | Promise<void> {
		Players.CharacterAutoLoads = false;
		this.dependencyDataListener();
	}

	@SpawnTask()
	async onDataLoad(player: Player, playerData: PlayerData): Promise<void> {
		try {
			const dependencies = <PlayerDependencies>this.getDependencies(true);
			const dependIterator = LazyIterator.fromValues(
				<Record<keyof PlayerDependencies, PlayerDependencies[keyof PlayerDependencies]>>dependencies,
			).sort((dependencies, nextDependencies) => {
				return dependencies.priority > nextDependencies.priority;
			});
			for (const dependency of dependIterator.collect())
				if ("onWrite" in dependency) await dependency.onWrite(player, playerData);

			this.database.set(player, playerData);
			player.LoadCharacterAsync();
		} catch (e) {
			$warn(e);
			this.kickPlayer(player);
		}
	}

	public characterKickPlayer(character: CharacterModel, reason: string = `[KICK] No Reason Given.`) {
		const player = this.get(character);
		if (!player) return false;
		this.kickPlayer(player, reason);
		return true;
	}

	public kickPlayer(player: Player, reason: string = `[KICK] No Reason Given.`) {
		player.Kick(reason);
	}

	public get(character: CharacterModel): Maybe<Player> {
		return Players.GetPlayerFromCharacter(character);
	}

	public getDependencies(tryGet: boolean = false): PlayerDependencies {
		const getName = tryGet ? "tryGetValue" : "getValue";
		return (<{ success: boolean; value: PlayerDependencies }>this.dependencies[getName]()).value;
	}

	public getData(player: Player): PlayerData {
		return this.database.get(player);
	}

	private async dependencyDataListener() {
		const dependencies = <PlayerDependencies>await this.getDependencies(true);
		const dependIterator = LazyIterator.fromValues(
			<Record<keyof PlayerDependencies, PlayerDependencies[keyof PlayerDependencies]>>dependencies,
		).sort((dependencies, nextDependencies) => {
			return dependencies.priority > nextDependencies.priority;
		});
		const staticDependencies = dependIterator.collect();
		this.database.updated.Connect(async (player: Player, data: PlayerData) => {
			for (const dependency of staticDependencies) {
				if ("onChanged" in dependency) await dependency.onChanged(player, data);
			}
		});
	}
}
