import { Dependency, type OnStart } from "@flamework/core";
import { Component, type Components } from "@flamework/components";
import { $nameof } from "rbxts-transform-debug";
import { HurtboxAttributes, HurtboxInstanceProperties } from "shared/enums/hurtbox-enum";
import { Create, Reconcile } from "shared/utility/instance";
import type { NestService } from "serverstorage/services/nest";
import type { PartService } from "serverstorage/services/part";
import InstanceExtendable from "shared/base-components/instance";
import { DeferTask } from "shared/decorators";
import type { HurtboxLiteral } from "shared/structs/hitbox";

type Attributes = typeof HurtboxInstanceProperties & typeof HurtboxAttributes;

@Component({
	tag: $nameof<Hurtbox>(),
	defaults: { ...HurtboxInstanceProperties, ...HurtboxAttributes },
})
export class Hurtbox extends InstanceExtendable<Attributes, HurtboxLiteral> implements OnStart {
	private character: CharacterModel = <CharacterModel>this.instance.Reference.Value;
	private parent: Folder;
	public constructor(
		private readonly nest: NestService,
		private readonly partService: PartService,
	) {
		super();
		this.parent = this.nest.getReserved("Hurtbox");
	}
	@DeferTask()
	public onStart(): void {
		Reconcile(this.instance, HurtboxInstanceProperties);
		this.updateHurtbox();
		this.weldHurtbox(this.instance, this.character.HumanoidRootPart);
		this.partService.ownerify(this.instance, <CharacterModel>this.instance.Reference.Value);
		this.addToCleanup(
			this.instance,
			this.character
				.FindFirstChild<BasePart>("Torso")!
				.GetPropertyChangedSignal("Size")
				.Connect(() => this.updateHurtbox()),
			this.instance.Destroying.Connect(() => this.onDestroy()),
		);
	}

	public updateHurtbox(): void {
		const root = this.character.HumanoidRootPart;
		const torso = this.character.FindFirstChild<BasePart>("Torso");
		const humanoid = this.character.Humanoid;
		if (!root || !torso || !this.instance || !humanoid) return;
		if (!this.instance.Parent) this.instance.Parent = this.parent;
		const baseSize = <Vector3>this.attributes.Size;
		const hipScale = humanoid.HipHeight / 2 + 1;
		this.instance.Size = new Vector3(
			baseSize.X * torso.Size.X * hipScale,
			baseSize.Y * torso.Size.X * hipScale,
			baseSize.Z * torso.Size.Z,
		);
		const offset = new Vector3(0, humanoid.HipHeight, 0);
		const position = root.Position.add(offset);
		const lockedRotation = <CFrame>this.attributes.CFrame;
		this.instance.CFrame = new CFrame(position).mul(lockedRotation);
	}

	private weldHurtbox(hurtbox: BasePart, root: BasePart) {
		const weld = Create("WeldConstraint", "HurtboxWeld", hurtbox);
		weld.Part0 = hurtbox;
		weld.Part1 = root;
		return weld;
	}

	public static create(character: CharacterModel): Hurtbox {
		const dependency = Dependency<Components>();
		const hurtboxLiteral = Create("Part", $nameof<Hurtbox>());
		this.createHurtboxReference(hurtboxLiteral, character);
		this.createHurtboxShape(hurtboxLiteral);
		const component = dependency.addComponent<Hurtbox>(hurtboxLiteral);
		return component;
	}

	private static createHurtboxReference(hurtbox: BasePart, character: CharacterModel, parent: boolean = true) {
		const reference = Create("ObjectValue", "Reference");
		reference.Value = character;
		if (parent) reference.Parent = hurtbox;
		return reference;
	}

	private static createHurtboxShape(hurtbox: BasePart, parent: boolean = true) {
		const reference = Create("SpecialMesh", "Shape");
		reference.MeshType = Enum.MeshType.Sphere;
		if (parent) reference.Parent = hurtbox;
		return reference;
	}
	public static is(obj: Instance): boolean {
		return obj.GetAttribute("UUID") === HurtboxAttributes.UUID;
	}
}
