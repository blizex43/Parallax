import { ContentProvider, ReplicatedStorage, RunService, ServerStorage } from "@rbxts/services";
import { assetTypes, AssetTypes } from "shared/enums/asset-enum";

export class Preloader {
	private readonly assetTypes = assetTypes;
	private readonly loadedAssets = new Set<Instance>();

	private readonly clientContainer = ReplicatedStorage.WaitForChild("Assets");
	private readonly serverContainer = RunService.IsServer() ? ServerStorage.FindFirstChild("Assets") : undefined;
	constructor() {}
	public async initialize(typeFilter?: AssetTypes): Promise<Instance[]> {
		const assets = this.collectAssets(typeFilter);
		await this.preloadAssets(assets);
		return assets;
	}

	public isLoaded(instance: Instance): boolean {
		return this.loadedAssets.has(instance);
	}

	public async preloadAssets(instances: Instance[], debug = false): Promise<void> {
		const toLoad = instances.filter((inst) => !this.isLoaded(inst));

		if (toLoad.size() === 0) return;

		await new Promise<void>((resolve) => {
			ContentProvider.PreloadAsync(toLoad, (assetId, status) => {
				if (debug) {
					print(`[Preloader] ${toLoad} -> ${assetId} -> ${status.Name}`);
				}
			});
			resolve();
		});

		toLoad.forEach((inst) => this.loadedAssets.add(inst));
	}

	private collectAssets(typeFilter?: AssetTypes): Instance[] {
		const containers = [<Folder>this.clientContainer, <Folder>this.serverContainer].filter((v) => v !== undefined);
		const allDescendants = containers.map((container) => container.GetDescendants()).reduce((a, b) => [...a, ...b]);

		return allDescendants.filter((instance) => {
			if (!this.isLoadable(instance)) return false;
			if (typeFilter) return instance.ClassName === typeFilter;
			return true;
		});
	}

	private isLoadable(instance: Instance): boolean {
		return this.assetTypes.includes(instance.ClassName as AssetTypes);
	}
}
