import { type OnInit, Service } from "@flamework/core";
import { ServerStorage } from "@rbxts/services";
import { LinkRemote } from "serverstorage/decorators";
import { Events } from "serverstorage/network";
import { LogBenchmark, SpawnTask } from "shared/decorators";
import {
	combatAnimationLiterals,
	movementAnimationLiterals,
	styleAnimationLiterals,
	styleClientSafeLiterals,
} from "shared/enums/animation-enum";
import { Serializers } from "shared/network";
import type { AnimationPacket, AnimationPacketResolved, AssetPacket } from "shared/structs/packets";
import { roundDecimal } from "shared/utility/numbers";
import type { DataService } from "./third-party/data";
import type { PlayerData, PlayerDataKeys } from "shared/data-models/player-data";
import type {
	ClientSafeStyleAnimations,
	CombatAnimations,
	MovementAnimations,
	StyleAnimations,
} from "shared/structs/animation";
import { Create } from "shared/utility/instance";
import { Preloader } from "shared/classes/preload";
import { $warn } from "rbxts-transform-debug";
import { isAnimation, isFolder } from "shared/utility/t-isA";
import Object from "@rbxts/object-utils";
import { isAssetId } from "shared/utility/strings";
import type { Styles } from "shared/structs/styles";
@Service()
export class AssetService extends Preloader implements OnInit {
	public movementAnimations = <MovementAnimations>{};
	public combatAnimations = <CombatAnimations>{};
	public readonly styleAnimations = new Map<Styles, Map<string, StyleAnimations>>();
	public readonly assetLocation = ServerStorage.Assets;
	public readonly animationLocation = this.assetLocation.Animations;
	public readonly combatLocation = this.animationLocation.Combat;
	public readonly styleLocation = this.animationLocation.Styles;
	public readonly movementLocation = this.animationLocation.Movement;
	constructor(private readonly database: DataService) {
		super();
	}
	@SpawnTask()
	public async onInit(): Promise<void> {
		this.setAnimationReferences();
		this.dependencyDataListener();
		// this.initialize();
	}
	@LinkRemote(Events.asset.initialize)
	@LogBenchmark((_, msElapsed, player) => `Initialized ${player}'s asset data in ${roundDecimal(msElapsed, 2)} ms`)
	public async setup(player: Player): Promise<void> {
		this.initializeAssets(player)
			.then((asset) => {
				print(asset);
				Events.asset.replicate(player, Serializers.asset.serialize(asset));
			})
			.catch((reason: string) => {
				$warn(reason);
			});
	}

	private dependencyDataListener() {
		this.database.updated.Connect(async (player: Player, _: PlayerData, keys: PlayerDataKeys[]) => {
			if (!keys.includes("style")) return;
			print("Changing Client Assets!", keys);
			this.setup(player);
		});
	}

	private setAnimationReferences() {
		this.movementAnimations = this.createMovementAnimationTable();
		this.combatAnimations = this.createCombatAnimationTable();
		for (const child of this.movementLocation.GetDescendants()) {
			if (!isAnimation(child)) continue;
			const lowerName = child.Name.lower();
			if (lowerName in this.movementAnimations) {
				this.movementAnimations[<keyof MovementAnimations>lowerName] = child;
			}
		}
		for (const child of this.combatLocation.GetDescendants()) {
			if (!isAnimation(child)) continue;
			const lowerName = child.Name.lower();
			if (lowerName in this.combatAnimations) {
				this.combatAnimations[<keyof CombatAnimations>lowerName] = child;
			}
		}
		for (const style of this.styleLocation.GetChildren()) {
			if (!isFolder(style)) continue;
			const styleKey = <Styles>style.Name;
			let stanceMap = this.styleAnimations.get(styleKey);
			if (!stanceMap) {
				stanceMap = new Map<string, StyleAnimations>();
				this.styleAnimations.set(styleKey, stanceMap);
			}

			for (const stance of style.GetChildren()) {
				if (!isFolder(stance)) continue;
				const stanceKey = stance.Name.lower();
				const anims = this.createStyleAnimationTable();
				for (const child of stance.GetChildren()) {
					if (!isAnimation(child)) continue;
					const lowerName = child.Name.lower();
					if (lowerName in anims) {
						anims[<keyof StyleAnimations>`${lowerName}`] = child;
					}
				}
				stanceMap.set(stanceKey, anims);
			}
		}
	}

	private async initializeAssets(player: Player): Promise<AssetPacket> {
		const playerData = await this.database.forceGet(player);
		const animations: AnimationPacketResolved = this.animationsToAssetId(
			Object.deepCopy({
				style: <ClientSafeStyleAnimations>this.getStyleAnimations(playerData),
				movement: <MovementAnimations>this.getMovementAnimations(),
				combat: <CombatAnimations>this.getCombatAnimations(),
			}),
		);
		return animations;
	}

	private animationsToAssetId(animations: AnimationPacket): AnimationPacketResolved {
		for (const [, animHost] of pairs(animations))
			for (const [name, animation] of pairs(<CombatAnimations>animHost)) {
				(<CombatAnimations>animHost)[name] = isAssetId(animation.AnimationId)
					? <never>animation.AnimationId
					: <never>"rbxassetid://0";
			}

		return <AnimationPacketResolved>(<never>animations);
	}

	private createStyleAnimationTable(): StyleAnimations {
		const output = <StyleAnimations>{};
		for (const name of styleAnimationLiterals) {
			output[name] = Create("Animation");
		}
		return output;
	}

	private createCombatAnimationTable(): CombatAnimations {
		const output = <CombatAnimations>{};
		for (const name of combatAnimationLiterals) {
			output[name] = Create("Animation");
		}
		return output;
	}

	private createMovementAnimationTable(): MovementAnimations {
		const output = <MovementAnimations>{};
		for (const name of movementAnimationLiterals) {
			output[name] = Create("Animation");
		}
		return output;
	}

	private getMovementAnimations(): MovementAnimations {
		return this.movementAnimations;
	}

	private getCombatAnimations(): CombatAnimations {
		return this.combatAnimations;
	}

	private removeStyleSafeIndexes(anims: StyleAnimations): ClientSafeStyleAnimations {
		const obj = <ClientSafeStyleAnimations>{};
		for (const [name, value] of pairs(anims)) {
			if (styleClientSafeLiterals.includes(<"style_idle">("style_" + name))) {
				obj[<keyof ClientSafeStyleAnimations>("style_" + name)] = value;
			}
		}
		return obj;
	}

	private getStyleAnimations(playerData: PlayerData): ClientSafeStyleAnimations {
		const styleKey = playerData.style;
		const stanceKey = playerData.stance;
		const styleMap =
			this.styleAnimations.get(styleKey) ??
			this.styleAnimations.get("Base") ??
			new Map<string, StyleAnimations>();
		const stanceAnims = styleMap.get(stanceKey) ?? styleMap.get("default") ?? this.createStyleAnimationTable();
		print(styleKey, stanceKey, styleMap);
		return this.removeStyleSafeIndexes(stanceAnims);
	}
}
