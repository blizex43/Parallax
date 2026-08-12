import { AssetService, Players } from "@rbxts/services";
import { $warn } from "rbxts-transform-debug";
import type { PlayerData, PlayerDataKeys } from "shared/data-models/player-data";
import {
	BaseHairColor,
	BaseMeshName,
	BaseMeshTexture,
	BlacklistedHairTypes,
	HairHandleProperties,
} from "shared/enums/hair-enum";
import Log from "shared/log";
import { CharacterDependency } from "shared/structs/linked-dependency";
import { isAttachment, isObject, isWeld } from "shared/utility/t-isA";
export class HairDependency implements CharacterDependency {
	public readonly changableKeys: PlayerDataKeys[] = ["hairColor"];
	public readonly priority: number = 1;
	private readonly hairCache: Map<Player, Accessory[]> = new Map();
	async onWrite(player: Player, playerData: PlayerData, character: CharacterModel): Promise<void> {
		const color = playerData.hairColor ?? BaseHairColor;
		const humanoid = character.Humanoid;
		const hairs = await this.get(player.UserId);
		if (!hairs || hairs.isEmpty()) return;
		return new Promise<void>((resolve, reject) => {
			this.transformHairs(hairs);
			if (isObject(hairs)) resolve();
			else reject("Hair is not a table");
		})
			.then(() => {
				this.colorHair(hairs, color);
			})
			.then(() => {
				this.setOnSelf(humanoid, hairs);
			})
			.then(() => {
				this.hairCache.set(player, hairs);
			})
			.catch((reason: string) => {
				Log.warn(reason);
			});
	}

	async onChanged(player: Player, playerData: PlayerData): Promise<void> {
		const color = playerData.hairColor;
		const cache = this.hairCache.get(player);
		if (!cache || cache.isEmpty()) return;
		const sample = cache[0];
		const handle = this.getHandle(sample);
		if (!handle) return;
		const hairMesh = this.getMesh(handle);
		if (!hairMesh || hairMesh.VertexColor === this.color3ToVector3(color)) return;
		this.colorHair(cache, color);
	}

	private async get(userId: number): Promise<Maybe<Accessory[]>> {
		const appearance = await this.getCharacterAppearance(userId);
		if (!appearance) return;
		const apiHairSet = appearance.assets.filter((asset) => asset.assetType.name === "HairAccessory");
		const gameHairSet: Accessory[] = [];
		for (const asset of apiHairSet) {
			const model = await this.loadAsset(asset.id);
			const accessory = model?.FindFirstChildOfClass("Accessory");
			if (!model || !accessory) {
				model?.Destroy();
				continue;
			}
			gameHairSet.push(accessory);
		}
		return gameHairSet;
	}

	private set(hair: SpecialMesh, color: Color3) {
		hair.VertexColor = this.color3ToVector3(color);
	}

	private color3ToVector3(color: Color3): Vector3 {
		return new Vector3(color.R, color.G, color.B);
	}

	private setOnSelf(humanoid: Humanoid, hairs: Accessory[]) {
		for (const hair of hairs) humanoid.AddAccessory(hair);
	}

	private colorHair(hairs: Accessory[], color: Color3) {
		for (const hair of hairs) {
			const handle = this.getHandle(hair);
			if (!handle) continue;
			const hairMesh = this.getMesh(handle);
			if (!hairMesh) continue;
			this.set(hairMesh, color);
		}
	}

	private getHandle(hair: Accessory): Maybe<BasePart> {
		return hair.FindFirstChild<BasePart>("Handle");
	}

	private getMesh(handle: BasePart) {
		return handle.FindFirstChild<SpecialMesh>(BaseMeshName);
	}

	private transformHairs<T extends Accessory[]>(hairs: Accessory[]): T {
		hairs = hairs.filter((hair) => {
			const oldHandle = this.getHandle(hair);
			if (!oldHandle) return false;
			const handle = this.makeHairHandle(oldHandle);
			const mesh = this.makeHairMesh(oldHandle);
			this.connectHairMeshAndHandle(handle, oldHandle, mesh);
			handle.Parent = hair;
			return true;
		});

		return <T>hairs;
	}

	private connectHairMeshAndHandle(newHandle: BasePart, oldHandle: BasePart, mesh: SpecialMesh) {
		const handleDescendants = oldHandle.GetDescendants();
		const notAllowedEffects = handleDescendants.filter(
			(child) => BlacklistedHairTypes.includes(child.ClassName) || (isWeld(child) && !child.Active),
		);
		const attachments: Attachment[] = handleDescendants.filter((child) => isAttachment(child));
		mesh.Parent = newHandle;
		for (const attachment of attachments) {
			attachment.Parent = newHandle;
		}
		for (const effect of notAllowedEffects) {
			effect.Destroy();
		}
		oldHandle.Destroy();
	}

	private makeHairMesh(previous: BasePart | MeshPart): SpecialMesh {
		const newMesh = new Instance("SpecialMesh");
		const backupMesh = previous.FindFirstChildOfClass("SpecialMesh");
		if (previous.ClassName === "MeshPart" && !backupMesh) {
			newMesh.MeshId = (<MeshPart>previous).MeshId;
		}
		if (backupMesh) {
			newMesh.MeshId = backupMesh.MeshId;
			newMesh.Scale = backupMesh.Scale;
		}
		newMesh.TextureId = BaseMeshTexture;
		newMesh.Name = BaseMeshName;
		return newMesh;
	}

	private makeHairHandle(previous: BasePart): BasePart {
		const handle = previous.Clone();
		handle.ClearAllChildren();
		for (const [name, property] of pairs(HairHandleProperties)) {
			handle[<"Name">name] = <string>property;
		}
		return handle;
	}

	private async getCharacterAppearance(userId: number): Promise<CharacterAppearanceInfo> {
		return new Promise((resolve, reject) => {
			this.getAppearanceFromMarketplace(userId)
				.then((appearance) => {
					resolve(<CharacterAppearanceInfo>appearance);
				})
				.catch((reason) => {
					reject(reason);
				});
		});
	}

	private async loadAsset(assetId: number): Promise<Maybe<Model>> {
		try {
			const assetModel = <Maybe<Model>>AssetService.LoadAssetAsync(assetId);
			if (!assetModel) throw false;
			return assetModel;
		} catch {
			return;
		}
	}

	private async getAppearanceFromMarketplace(userId: number): Promise<Maybe<CharacterAppearanceInfo>> {
		try {
			const appearance = Players.GetCharacterAppearanceInfoAsync(userId);
			return appearance;
		} catch (e) {
			$warn(e);
			return;
		}
	}
}
