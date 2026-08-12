import { Controller, type OnStart } from "@flamework/core";
import type { AssetPacket } from "shared/structs/packets";
import { Events } from "client/network";
import type { OnAssetLoad } from "client/hooks";
import { SpawnTask } from "shared/decorators";
import { Preloader } from "shared/classes/preload";
import { isInstance, isObject } from "shared/utility/t-isA";
@Controller()
export class AssetController extends Preloader implements OnStart, OnAssetLoad {
	constructor() {
		super();
	}
	onStart(): void {
		Events.asset.initialize.fire();
		this.initialize();
	}
	@SpawnTask()
	async onAssetLoad(data: AssetPacket): Promise<void> {
		const assets = await this.iterateAssetPacketForAssets(data);
		return await this.preloadAssets(assets);
	}

	private async iterateAssetPacketForAssets(data: AssetPacket): Promise<Instance[]> {
		const assets = <Instance[]>[];
		const iterate = (obj: object) => {
			for (const [, upperLevelValues] of pairs(obj)) {
				if (isInstance(upperLevelValues)) assets.push(upperLevelValues);
				else if (isObject(upperLevelValues)) iterate(upperLevelValues);
			}
		};
		iterate(data);
		return assets;
	}
}
