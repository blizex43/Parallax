import { $nameof } from "rbxts-transform-debug";
import type { PsuedoService } from "./psuedo";
import Log from "shared/log";
import type { CreateType, NPCType } from "shared/structs/npc";
import { AutomatedCharacterComponent } from "serverstorage/components/automated-character";
import type { PsuedoDefaultData } from "shared/structs/psuedo";
import { NPCAdded, NPCRemoving } from "shared/constants";
//@Service()
export class NpcService {
	protected tag: string = $nameof<NpcService>();
	private readonly npcPool: Map<CharacterModel, NPCType> = new Map();
	constructor(
		private readonly psuedo: PsuedoService,
	) {}
	onInit(): void {}

	public create(fill: CreateType): Maybe<NPCType> {
		const data = this.psuedo.allocate(fill);
		if (!data) return;
		const model = fill.Model
			? (this.model.get(fill.Model) ?? this.model.getAuto(fill.Model).shift()?.Clone())
			: this.model.getRandomDummy();

		if (!model) return Log.fatal(`Failed to generate NPC; Failed to fetch model using Query(D).`);
		const modelName = model.Name;
		const component = AutomatedCharacterComponent.create(model);
		this.psuedo.set(model, data);
		this.fillComponent(component, fill, data, modelName);
		const built: NPCType = {
			component,
			model,
			ai: this.ai.getForNPC(model, fill.Type ?? "dummyattack")!,
		};
		this.set(built);
		if (fill.Enable && built.ai && built.ai.fsm) built.ai.fsm.Start();
		return built;
	}

	public destroy(npc: NPCType) {
		NPCRemoving.Fire(npc);
		npc.model.Destroy();
	}

	public set(npc: NPCType): void {
		this.npcPool.set(npc.model, npc);
		NPCAdded.Fire(npc);
	}

	public fillComponent(
		component: AutomatedCharacterComponent,
		fill: CreateType,
		data: PsuedoDefaultData,
		name: string,
	) {
		fill.Position ??= component.instance.GetPivot().Position;
		component.modifyData(data);
		component.rename(name);
		component.transport(fill.Position);
	}
}
