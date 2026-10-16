import { Service } from "@flamework/core";
import { AutomatedCharacterComponent } from "serverstorage/components/automated-character";
import { AIService } from "./ai";
import { ModelService } from "./model";
import { NestService } from "./nest";
import { PsuedoService } from "./psuedo";
import { NPCAdded, NPCRemoving } from "shared/constants";
import { isModel } from "shared/utility/t-isA";
import Log from "shared/log";
import type { EntityCreationProperties, NPCProperties } from "shared/structs/npc";
import type { Memories } from "shared/structs/brain";

@Service()
export class NpcService {
	private readonly pool = new Map<CharacterModel, NPCProperties>();

	public constructor(
		private readonly psuedo: PsuedoService,
		private readonly models: ModelService,
		private readonly ai: AIService,
		private readonly nest: NestService,
	) {}

	public create(properties: EntityCreationProperties): NPCProperties {
		const model = this.createModel(properties);
		if (!model) return Log.fatal("Failed to generate NPC; model query returned no result.");
		const data = this.psuedo.allocate(properties);
		const name = model.Name;
		model.SetAttribute("Style", tostring(data.style));
		model.SetAttribute("Stance", data.stance);
		model.SetAttribute("NPCAnimation", "idle");
		model.SetAttribute("NPCAnimationSpeed", 1);
		this.psuedo.set(model, data);
		const component = AutomatedCharacterComponent.create(model);
		component.rename(name);
		component.transport(properties.position ?? model.GetPivot().Position);

		const memories: Memories = {
			data,
			mastery: properties.mastery,
			entityIdentity: properties.entityIdentity,
			behavior: properties.behavior,
			preset: properties.preset,
		};
		const brain = this.ai.install(model, memories);
		const npc: NPCProperties = { data, component, model, brain };
		this.pool.set(model, npc);
		component.parentToNest();
		NPCAdded.Fire(npc);
		return npc;
	}

	public get(model: CharacterModel): Maybe<NPCProperties> {
		return this.pool.get(model);
	}

	public destroy(npc: NPCProperties): void {
		if (!this.pool.has(npc.model)) return;
		NPCRemoving.Fire(npc);
		this.pool.delete(npc.model);
		this.ai.uninstall(npc.model);
		npc.brain.shutdown();
		this.psuedo.del(npc.model);
		this.nest.onCharacterRemove(npc.model);
		npc.model.Destroy();
	}

	private createModel(properties: EntityCreationProperties): Maybe<CharacterModel> {
		if (isModel(properties.model)) return properties.model;
		if (properties.model) {
			const selected = this.models.get(properties.model) ?? this.models.getAuto(properties.model)[0];
			return selected?.Clone();
		}
		return this.models.getRandomDummy();
	}

}
