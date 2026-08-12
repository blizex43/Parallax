import { type OnInit, Service } from "@flamework/core";
import type { OnCharacterDataLoad } from "serverstorage/hooks";
import type { FakeHeadService } from "./fake-head";
import type { FaceType } from "shared/structs/face";
import { Players, ServerStorage } from "@rbxts/services";
import type { PlayerData, PlayerDataKeys, PsuedoPlayerData } from "shared/data-models/player-data";
import type { DataService } from "./third-party/data";
import type { GUIDService } from "./guid";
import { OnCharacterRemove } from "shared/hooks";
import { BlinkDurationTime, BlinkIntervalRange, EyeClanColors } from "shared/enums/face-enum";
import Object from "@rbxts/object-utils";
@Service()
export class FaceService implements OnCharacterDataLoad, OnInit, OnCharacterRemove {
	private readonly changableKeys: PlayerDataKeys[] = ["eyes", "eyeColor", "nose", "marking", "mouth", "glowingEyes"];
	private readonly parentGenderFolder = ServerStorage.Assets.Faces;
	private readonly maleAssetFolder = this.parentGenderFolder.Male;
	private readonly femaleAssetFolder = this.parentGenderFolder.Female;
	private readonly currentFaces: Map<CharacterModel, FaceType> = new Map();
	public constructor(
		private readonly fakeHead: FakeHeadService,
		private readonly database: DataService,
		private readonly guid: GUIDService,
	) { }

	public onInit(): void {
		this.database.updated.Connect(
			(player, data, keys) =>
				keys.some((key) => this.changableKeys.includes(key)) && this.onChanged(player, data),
		);
	}

	public onCharacterDataLoad(character: CharacterModel): void {
		const fakeHead = this.fakeHead.get(character);
		const possiblePlayer = Players.GetPlayerFromCharacter(character);
		const data = possiblePlayer
			? this.database.get(possiblePlayer)
			: this.database.getPsuedo(this.guid.get(character));
		if (!fakeHead) return;
		const faceType = this.cloneAll(this.gather(data));
		this.colorEyeArea(data, faceType);
		this.discriminateAll(faceType);
		this.parentAll(fakeHead, faceType);
		this.enableBlink(faceType);
		this.setFaceType(character, faceType);
	}

	public onCharacterRemove(character: CharacterModel): void {
		this.delFaceType(character);
	}

	private onChanged(player: Player, data: PlayerData) {
		const character = <Maybe<CharacterModel>>player.Character;
		if (!character) return;
		const faceType = this.getFaceType(character);
		if (!faceType) return;
		this.colorEyeArea(data, faceType);
		if (this.faceChanged(data, faceType)) {
			this.destroyFaceType(faceType);
			this.delFaceType(character);
			this.onCharacterDataLoad(character);
		}
	}

	private setFaceType(character: CharacterModel, faceType: FaceType): void {
		return void this.currentFaces.set(character, faceType);
	}

	private delFaceType(character: CharacterModel): void {
		return void this.currentFaces.delete(character);
	}

	private getFaceType(character: CharacterModel): Maybe<FaceType> {
		return this.currentFaces.get(character);
	}

	private enableBlink(faceType: FaceType): thread {
		return task.spawn(() => {
			let duration: number;
			do {
				if (!faceType.Eyes || !faceType.Eyes.Parent) break;
				duration = new Random().NextNumber(...BlinkIntervalRange);
				this.blink(faceType);
			} while (task.wait(duration));
		});
	}

	private blink(faceType: FaceType): void {
		const duration = new Random().NextNumber(...BlinkDurationTime);
		if (faceType.Eyes && faceType.Pupils && faceType.Blink) {
			faceType.Eyes.Transparency = 1;
			faceType.Pupils.Transparency = 1;
			faceType.Blink.Transparency = 0;
			task.delay(duration, () => {
				if (faceType.Eyes && faceType.Pupils && faceType.Blink) {
					faceType.Blink.Transparency = 1;
					faceType.Pupils.Transparency = 0;
					faceType.Eyes.Transparency = 0;
				}
			});
		}
	}

	private destroyFaceType(faceType: FaceType): void {
		for (const decal of Object.values(faceType)) decal.Destroy();
	}

	private faceChanged(data: PsuedoPlayerData, faceType: FaceType): boolean {
		const cloneType = this.gather(data);
		for (const [key, expected] of pairs(cloneType)) {
			const current = faceType[key];
			if (!current || !expected) return true;
			if (current.ColorMapContent !== expected.ColorMapContent) return true;
		}

		return false;
	}

	private gather(data: PsuedoPlayerData): FaceType {
		const folder = data.gender === "Male" ? this.maleAssetFolder : this.femaleAssetFolder;
		return {
			Eyes: folder.Eyes.FindFirstChild(data.eyes),
			Blink: folder.Blinks.FindFirstChild(data.eyes),
			Nose: folder.Noses.FindFirstChild(data.nose),
			Pupils: folder.Pupils.FindFirstChild(data.eyes),
			Mouth: folder.Mouths.FindFirstChild(data.mouth),
			Marking: this.parentGenderFolder.Markings.FindFirstChild(data.marking),
		};
	}

	private enchantColor(color: Color3, multiply: number = 10): Color3 {
		return new Color3(color.R * multiply, color.G * multiply, color.B * multiply);
	}

	private colorEyeArea(data: PsuedoPlayerData, faceType: FaceType) {
		let eyeColor = EyeClanColors.Default;
		if (data.clan === "Kure" || data.clan === "Wu") eyeColor = EyeClanColors.KureWu;
		const pupilColor = data.eyeColor;
		if (faceType.Eyes) faceType.Eyes.Color3 = eyeColor;
		if (faceType.Pupils) faceType.Pupils.Color3 = data.glowingEyes ? this.enchantColor(pupilColor) : pupilColor;
	}

	private discriminateAll(faceType: FaceType): void {
		for (const [name, decal] of pairs(faceType)) decal.Name = `${name}${decal.Name}`;
	}

	private parentAll(head: FakeHeadInstance, faceType: FaceType): void {
		for (const [, decal] of pairs(faceType)) decal.Parent = head;
	}
	private cloneAll(faceType: FaceType): FaceType {
		for (const [name, decal] of pairs(faceType)) faceType[name] = decal.Clone();
		return faceType;
	}
}
