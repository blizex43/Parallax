import { type OnInit, Service } from "@flamework/core";
import type { DataService } from "./third-party/data";
import { ServerStorage } from "@rbxts/services";
import { Create } from "shared/utility/instance";
import type { OnDataLoad, OnPlayerLeave } from "serverstorage/hooks";
import type { PlayerData } from "shared/data-models/player-data";
import type { LogStart } from "shared/hooks";
import { capitalize, decapitalize } from "shared/utility/strings";
import LazyIterator from "@rbxts/lazy-iterator";
import {
	isBoolean,
	isCFrame,
	isColor3,
	isInstance,
	isNumber,
	isString,
	isValueBase,
	isVector3,
} from "shared/utility/t-isA";
@Service()
export class OutpostService implements OnInit, LogStart, OnDataLoad, OnPlayerLeave {
	private playerPrefix: string = "[";
	private playerDivider: string = "-";
	private playerSuffix: string = "]";
	public readonly dataCache: Map<Player, PlayerData> = new Map();
	public readonly homeDir: Instance = ServerStorage;
	public readonly homeName: string = "Player-Data";
	public readonly dir!: Folder;
	constructor(private readonly data: DataService) {}
	public async onInit(this: Writable<OutpostService>): Promise<void> {
		this.dir = this.homeDir.FindFirstChild<Folder>(this.homeName) ?? Create("Folder", this.homeName, this.homeDir);
		this.subscribeFromData();
	}

	public onDataLoad(player: Player, data: PlayerData): void {
		const dir = Create("Actor", this.getFileName(player), this.dir);
		this.iterateAndPostToDirectory(dir, data);
		this.dataCache.set(player, data);
		this.subscribeForData(dir, player, data);
	}

	async onPlayerLeave(player: Player): Promise<void> {
		this.dataCache.delete(player);
		const dir = this.getPlayerDirectory(player);
		if (dir) dir.Destroy();
	}

	public getPlayerDirectory(player: Player): Maybe<Actor> {
		return this.dir.FindFirstChild<Actor>(this.getFileName(player));
	}

	public getProperty(dir: Actor, name: string): Maybe<ValueBase> {
		return dir.FindFirstChild(capitalize(name));
	}

	public getFileName(player: Player): string {
		return `${this.playerPrefix}${player.Name}${this.playerDivider}${player.UserId}${this.playerSuffix}`;
	}

	public subscribeFromData(): RBXScriptConnection {
		return this.data.outpostUpdate.Connect((player: Player, playerData: PlayerData) => {
			const dir = this.getPlayerDirectory(player);
			const playerCache = this.dataCache.get(player);
			if (!dir || !playerCache) return;
			for (const [name, value] of pairs(playerData)) {
				if (name in playerCache && playerCache[name] !== value) {
					const property = this.getProperty(dir, name);
					if (property) property.Value = value;
				}
			}
		});
	}

	private subscribeForData(dir: Actor, player: Player, playerData: PlayerData) {
		const baseArray = LazyIterator.fromArray(dir.GetChildren()).filter((instance) => isValueBase(instance));
		for (const valueBase of baseArray.collect()) {
			valueBase.GetPropertyChangedSignal("Value").Connect(() => {
				const indexName = decapitalize(valueBase.Name);
				if (indexName in playerData) {
					(<Writable<PlayerData>>playerData)[<"hunger">indexName] = <number>valueBase.Value;
					this.data.set(player, playerData, false);
				}
			});
		}
	}

	private iterateAndPostToDirectory(dir: Actor, data: PlayerData, ignore?: string[]): void {
		for (const [name, value] of pairs(data)) {
			if (ignore?.includes(name)) continue;

			if (isString(value)) Create("StringValue", capitalize(name), dir).Value = value;
			else if (isNumber(value)) Create("NumberValue", capitalize(name), dir).Value = value;
			else if (isBoolean(value)) Create("BoolValue", capitalize(name), dir).Value = value;
			else if (isVector3(value)) Create("Vector3Value", capitalize(name), dir).Value = value;
			else if (isCFrame(value)) Create("CFrameValue", capitalize(name), dir).Value = value;
			else if (isColor3(value)) Create("Color3Value", capitalize(name), dir).Value = value;
			else if (isInstance(value)) Create("ObjectValue", capitalize(name), dir).Value = value;
		}
	}
}
