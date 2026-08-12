import { Modding, Controller, type OnStart } from "@flamework/core";
import type { OnAssetLoad } from "client/hooks";
import { Events } from "client/network";
import { Serializers } from "shared/network";
import { AssetPacket } from "shared/structs/packets";

@Controller({ loadOrder: 0 })
export class AssetUpdateController implements OnStart {
	public onStart(): void {
		const addListeners = new Set<OnAssetLoad>();
		Modding.onListenerAdded<OnAssetLoad>((object) => addListeners.add(object));
		Modding.onListenerRemoved<OnAssetLoad>((object) => addListeners.delete(object));
		async function assetLoaded(assets: AssetPacket): Promise<void> {
			for (const listener of addListeners) listener.onAssetLoad(assets);
		}
		Events.asset.replicate.connect(async ({ buffer, blobs }) => {
			print(Serializers.asset.deserialize(buffer, blobs));
			assetLoaded(Serializers.asset.deserialize(buffer, blobs));
		});
	}
}
