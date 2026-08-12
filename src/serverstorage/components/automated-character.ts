import { Dependency, OnStart } from "@flamework/core";
import { Component, type Components } from "@flamework/components";
import { $nameof } from "rbxts-transform-debug";
import { NestService } from "serverstorage/services/nest";
import InstanceExtendable from "shared/base-components/instance";
import { AutomatedCharacterAttributes } from "serverstorage/enums/automated-character-enum";
import type { PsuedoPlayerData } from "shared/data-models/player-data";
import { DataService } from "serverstorage/services/third-party/data";
import { atom } from "@rbxts/charm";
import { GUIDService } from "serverstorage/services/guid";
import { Workspace as World } from "@rbxts/services";

type Attributes = typeof AutomatedCharacterAttributes;
@Component({
	tag: $nameof<AutomatedCharacterComponent>(),
	defaults: AutomatedCharacterAttributes,
})
export class AutomatedCharacterComponent extends InstanceExtendable<Attributes, CharacterModel> implements OnStart {
	public pos: Charm.Atom<Vector3> = atom(Vector3.zero);
	public readonly humanoid = this.instance.Humanoid;
	public readonly root = this.instance.HumanoidRootPart;
	public readonly data!: PsuedoPlayerData;
	constructor(
		public readonly database: DataService,
		public readonly guid: GUIDService,
		readonly nest: NestService,
	) {
		super();
	}

	public override onStart(): void {
		this.giveData();
	}

	public rename(name: string) {
		this.instance.Name = name;
	}

	public parentToNest() {
		this.nest.onCharacterAdd(this.instance);
		this.instance.HumanoidRootPart.Anchored = false;
		task.defer(() => this.transport(this.pos()));
	}

	public transport(pos: Vector3): void {
		if (this.instance.IsDescendantOf(World)) {
			this.instance.PivotTo(new CFrame(pos));
		} else this.pos(pos);
	}

	public modifyData(this: Writable<AutomatedCharacterComponent>, write: Partial<PsuedoPlayerData>): void {
		for (const [dataName, dataValue] of pairs(write))
			if (dataName in this.data) (<Writable<PsuedoPlayerData>>this.data)[dataName] = <never>dataValue;
	}


	private giveData(this: Writable<AutomatedCharacterComponent>): PsuedoPlayerData {
		return (this.data = this.database.getPsuedo(this.guid.get(this.instance)));
	}

	public static create(character: CharacterModel): AutomatedCharacterComponent {
		const dependency = Dependency<Components>();
		character.Name = $nameof<AutomatedCharacterComponent>();
		return dependency.addComponent(character);
	}
}
