import { type OnInit, Service } from "@flamework/core";
import { $nameof } from "rbxts-transform-debug";
import { TagHandler } from "shared/classes/tag";
import { CollisionConfiguration, CollisionGroups, NonCollisionConfiguration } from "shared/enums/collision-enum";
import { NestService } from "./nest";
import { PhysicsService as Physics } from "@rbxts/services";
import { isBasePart } from "shared/utility/t-isA";
import { SpawnTask } from "shared/decorators";
@Service()
export class CollisionService extends TagHandler implements OnInit {
	protected readonly tag: string = `[${$nameof<CollisionService>()}]`;
	constructor(private readonly nest: NestService) {
		super();
	}
	public onInit(): void {
		this.registerGroups();
		this.registerParent(this.nest.nest, CollisionGroups.Characters);
		this.registerParent(this.nest.getReserved("Hurtbox"), CollisionGroups.Hurtboxes);
	}

	@SpawnTask()
	public register(instance: Instance, group: CollisionGroups) {
		if (isBasePart(instance)) this.setGroup(instance, group);
		for (const descendant of instance.GetDescendants())
			if (isBasePart(descendant)) this.setGroup(descendant, group);
	}

	private registerGroups() {
		for (const [group] of pairs(CollisionGroups))
			if (!Physics.IsCollisionGroupRegistered(group)) Physics.RegisterCollisionGroup(group);

		for (const [group, groups] of pairs(NonCollisionConfiguration))
			if (Physics.IsCollisionGroupRegistered(group))
				for (const noCollideGroup of groups) Physics.CollisionGroupSetCollidable(group, noCollideGroup, false);

		for (const [group, groups] of pairs(CollisionConfiguration))
			if (Physics.IsCollisionGroupRegistered(group))
				for (const collideGroup of groups) Physics.CollisionGroupSetCollidable(group, collideGroup, true);
	}

	private registerParent(parent: Instance, group: CollisionGroups) {
		parent.ChildAdded.Connect((child) => this.register(child, group));
	}

	private setGroup(instance: BasePart, group: CollisionGroups): void {
		return (instance.CollisionGroup = group) && this.classify(instance);
	}

	private classify(instance: Instance) {
		if (this.has(instance)) return;
		this.give(instance);
	}
}
