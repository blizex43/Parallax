import { Dependency } from "@flamework/core";
import { Component, type Components } from "@flamework/components";
import { $nameof } from "rbxts-transform-debug";
import { Create, Reconcile } from "shared/utility/instance";
import type { NestService } from "serverstorage/services/nest";
import InstanceExtendable from "shared/base-components/instance";
import { HitboxAttributes, HitboxHandleAttributes, HitboxStudioSettings } from "serverstorage/enums/hitbox-enum";
import { Hurtbox } from "./hurtbox";
import Signal from "@rbxts/signal";
import { OverlapParamsBuilder, RaycastParamsBuilder } from "@rbxts/builders";
import { RunService as run, Workspace as World } from "@rbxts/services";
import { isBasePart, isModel } from "shared/utility/t-isA";
import type { HitboxType, HurtboxLiteral } from "shared/structs/hitbox";
import ShapecastHitbox from "shared/forks/shapecasthitbox";
import { Orbiter } from "shared/components/orbiter";
import { noop } from "shared/utility/functions";
type Attributes = typeof HitboxAttributes;
@Component({
	tag: $nameof<Hitbox>(),
	defaults: <Record<string, unknown>>(<unknown>HitboxAttributes),
})
export class Hitbox extends InstanceExtendable<Attributes, BasePart> {
	public onHitSignal: Signal<(character: CharacterModel) => void> = new Signal();
	public _hitbox!: HitboxType;
	private raycastOptions: RaycastParamsBuilder;
	private overlapOptions: OverlapParamsBuilder;
	private readonly cache: Instance[] = [];
	private readonly signals: RBXScriptConnection[] = [];

	constructor(readonly nest: NestService) {
		super();
		this.raycastOptions = new RaycastParamsBuilder()
			.SetFilter([...nest.getReserved("Hurtbox").GetChildren()], Enum.RaycastFilterType.Include)
			.SetIgnoreWater(true);
		this.overlapOptions = new OverlapParamsBuilder().SetFilter(
			this.raycastOptions.filterDescendantsInstances,
			Enum.RaycastFilterType.Include,
		);
	}

	public build(properties: Partial<Attributes>): void {
		return void Reconcile(<Record<string, unknown>>(<unknown>this.attributes), properties);
	}

	public toBlacklist(...args: Instance[]): void {
		this.raycastOptions = this.raycastOptions.RemoveFromFilter(...args);
		this.overlapOptions = this.overlapOptions.SetFilter(this.raycastOptions.filterDescendantsInstances);
	}

	public setDuration(duration: number): void {
		return void (this.attributes.duration = duration);
	}

	public setSize(size: Vector3) {
		this.attributes.Size = this.attributes.Size.mul(size);
	}

	public setMaxQueryable(amount: number) {
		this.attributes.maxQueryable = amount;
	}

	public link(callback: Callback): RBXScriptConnection {
		const connection = this.onHitSignal.Connect((character) => callback(character));
		this.signals.push(connection);
		return connection;
	}

	public start() {
		this.getStudioSettings();
		this._hitbox = new ShapecastHitbox(this.instance, this.raycastOptions.Build());
		this.setCastData();
		this.addToCleanup(this._hitbox, this.instance, () => {
			for (const signal of this.signals) if (signal.Connected) signal.Disconnect();
		});
		this.startHitbox();
	}

	private startHitbox(): void {
		this._hitbox.BeforeStart(() => {
			this.handleInitialOverlap();
		});
		this._hitbox.OnStopped((cleanCallbacks) => {
			this.onDestroy();
			(<Callback>cleanCallbacks)();
		});
		this._hitbox.OnHit(async (rayResult) => await this.onHit(rayResult.Instance));
		this._hitbox.HitStart(this.attributes.duration, this.raycastOptions.Build());
	}

	private async onHit(result: Instance): Promise<void> {
		if (
			this.cache.includes(result) ||
			this.cache.size() >= this.attributes.maxQueryable ||
			!isBasePart(result) ||
			(this.attributes.forceHurtboxDetection && !Hurtbox.is(result))
		)
			return;
		this.cache.push(result);
		const character = this.toCharacter(result);
		if (!character) return;
		this.cache.push(character);
		return this.onHitSignal.Fire(character);
	}

	private toCharacter(instance: BasePart): Maybe<CharacterModel> {
		return Hurtbox.is(instance)
			? <Maybe<CharacterModel>>(<HurtboxLiteral>instance).Reference.Value
			: isModel(instance.Parent)
				? <Maybe<CharacterModel>>instance.Parent
				: undefined;
	}

	private handleInitialOverlap() {
		const castData = this._hitbox.CastData;
		for (const found of World.GetPartBoundsInBox(
			this.instance.CFrame.mul(castData.CFrame),
			this.instance.Size.mul(castData.Size.mul(9)),
			this.overlapOptions.Build(),
		)) {
			this.onHit(found);
		}
	}

	private setCastData() {
		this._hitbox.SetCastData({
			CastType: this.attributes.CastType,
			CFrame: this.attributes.CFrame,
			Size: this.attributes.Size,
			Radius: this.attributes.Radius,
		});
	}

	public static create(
		character: CharacterModel,
		reference: BasePart = this.createHitboxHandle(character.HumanoidRootPart),
	): Hitbox {
		const dependency = Dependency<Components>();
		this.createHitboxReference(reference, character);
		this.createDamagePoint(reference, character.HumanoidRootPart);
		return dependency.addComponent(reference);
	}

	private static createHitboxHandle(handle: BasePart): BasePart {
		const anchor = new Instance("Part");
		Reconcile(anchor, HitboxHandleAttributes);
		anchor.Name = $nameof<Hitbox>();
		anchor.Parent = handle;
		return (
			Create("Weld", "Weld", anchor, (weld) => {
				weld.Part0 = anchor;
				weld.Part1 = handle;
			}) && anchor
		);
	}

	private static createHitboxReference(handle: BasePart, character: CharacterModel, parent: boolean = true): void {
		if (handle.FindFirstChild("Reference")) return;
		const reference = Create("ObjectValue", "Reference");
		reference.Value = character;
		if (parent) reference.Parent = handle;
	}

	private static createDamagePoint(handle: BasePart, rootPart: RootPart): Maybe<Attachment> {
		if (handle.FindFirstChild("DmgPoint")) return;
		return Create("Attachment", "DmgPoint", handle, (attachment) => {
			const orbiter = Orbiter.create(attachment);
			const connection = run.Stepped.Connect(() => {
				orbiter.update(rootPart.AssemblyLinearVelocity);
			});
			handle.Destroying.Once(() => noop(connection.Disconnect(), orbiter.onDestroy()));
		});
	}

	private getStudioSettings() {
		Reconcile(<Record<string, unknown>>(<unknown>ShapecastHitbox.Settings), HitboxStudioSettings);
	}
}
