import { Dependency, type OnStart } from "@flamework/core";
import { Component, Components } from "@flamework/components";
import { $nameof } from "rbxts-transform-debug";
import InstanceExtendable from "shared/base-components/instance";
import type { Memories } from "shared/structs/brain";
import { JournalService } from "serverstorage/services/journal";
import { GUIDService } from "serverstorage/services/guid";
import { Neurons } from "serverstorage/classes/neurons";
import { AttackHeaderService } from "serverstorage/services/attack-header";
import { BlockService } from "serverstorage/services/block";
import { StaminaService } from "serverstorage/services/stamina";
import { ElectricityCompartment } from "serverstorage/classes/compartments/electricity";
import { LogicCompartment } from "serverstorage/classes/compartments/logic";
import { ResourceCompartment } from "serverstorage/classes/compartments/resource";
import { PathingCompartment } from "serverstorage/classes/compartments/pathing";
import { NpcAnimationCompartment } from "serverstorage/classes/compartments/npc-animation";

@Component({ tag: $nameof<Brain>() })
export class Brain extends InstanceExtendable<{}, CharacterModel> implements OnStart {
	public readonly electricity = new ElectricityCompartment();
	public readonly logic = new LogicCompartment();
	public readonly resource: ResourceCompartment;
	public readonly pathing: PathingCompartment;
	public readonly npcAnimation: NpcAnimationCompartment;
	public memories?: Memories;
	private readonly neurons: Neurons;
	public constructor(
		private readonly guid: GUIDService,
		private readonly journal: JournalService,
		attack: AttackHeaderService,
		block: BlockService,
		stamina: StaminaService,
	) {
		super();
		this.resource = new ResourceCompartment(stamina);
		this.pathing = new PathingCompartment(this.instance);
		this.npcAnimation = new NpcAnimationCompartment(this.instance);
		this.neurons = new Neurons(this, journal, attack, block);
	}
	public onStart(): void {}

	public initiate(memories: Memories): void {
		this.memories = memories;
		this.guid.get(this.instance);
	}

	public process(): void {
		this.neurons.process();
	}

	public shutdown(): void {
		this.pathing.destroy();
		this.memories = undefined;
	}

	public static create(model: CharacterModel): Brain {
		const dependency = Dependency<Components>();
		return dependency.addComponent<Brain>(model);
	}
}
