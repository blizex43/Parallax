import { Service } from "@flamework/core";
import { FSM } from "@rbxts/state-management";
import { $nameof, $warn } from "rbxts-transform-debug";
import { DefaultFSMCalls, PresetConfigs } from "serverstorage/enums/ai-enum";
import { type AIData, type AIPresetName } from "shared/structs/ai";
import Object from "@rbxts/object-utils";
import type { LogStart } from "shared/hooks";
import type { WebsocketService } from "./websocket";
import type { AiHandlerService } from "./ai-handler";
import { TagHandler } from "shared/classes/tag";
import type { BlackboardStateType } from "shared/structs/websocket";
import type { OnNPCDestroyed } from "serverstorage/hooks";
import type { NPCType } from "shared/structs/npc";
import DummyState from "serverstorage/states/dummy-idle";
@Service({ loadOrder: 2000 })
export class AiService extends TagHandler implements LogStart, OnNPCDestroyed {
	protected tag: string = $nameof<AiService>();
	constructor(
		private readonly ws: WebsocketService,
		private readonly handler: AiHandlerService,
	) {
		super();
	}

	public getForNPC(character: CharacterModel, presetName?: AIPresetName): Maybe<AIData> {
		const existing = this.handler.get(character);
		if (existing) return existing;
		if (presetName && PresetConfigs[presetName]) return this.assign(character, presetName);
		return existing;
	}

	public assign(character: CharacterModel, presetName: AIPresetName): Maybe<AIData> {
		const config = PresetConfigs[presetName];
		if (!config) {
			$warn(`AI preset "${presetName}" does not exist`);
			return;
		}
		const ws = this.ws.addNPC(character);
		const fsm = this.createFSM(presetName, ws.blackboard, character);
		ws.allocateToCharms(ws.formatToAllocationType(config));
		const data: AIData = {
			blackboard: ws.blackboard,
			aiType: presetName,
			ws,
			fsm: fsm,
		};
		super.give(character);
		this.handler.handle(character, data);
		// ask.delay(2, () => fsm.Start());
		return data;
	}

	public is(obj: CharacterModel): boolean {
		return super.has(obj);
	}

	public del(character: CharacterModel): void {
		const data = this.handler.get(character);
		if (data?.fsm) data.fsm.Stop();

		this.handler.halt(character);
	}

	public getAvailablePresets(): AIPresetName[] {
		return Object.keys(PresetConfigs);
	}

	public hasPreset(name: string): boolean {
		return name in PresetConfigs;
	}

	public getBlackboardValue<T>(character: CharacterModel, key: string): Maybe<T> {
		const aiData = this.handler.get(character);
		if (!aiData) return;
		return aiData.blackboard.GetWild<T>(key);
	}

	public setBlackboardValue(character: CharacterModel, key: string, value: unknown): void {
		const aiData = this.handler.get(character);
		if (!aiData) {
			$warn(`Cannot set blackboard value: No AI data for character`);
			return;
		}
		aiData.blackboard.SetWild(key, value);
	}

	public onNPCDestroyed(npc: NPCType): void {
		const data = this.handler.get(npc.model);
		if (data && data.fsm) data.fsm.Stop();
		this.handler.halt(npc.model);
		super.remove(npc.model);
	}

	private createFSM(presetName: AIPresetName, blackboard: BlackboardStateType, character: CharacterModel): FSM.FSM {
		const factory = DefaultFSMCalls[presetName];
		if (factory) return factory(blackboard, character);
		else {
			const fsm = new FSM.FSM("Dummy_Idle", blackboard);
			fsm.RegisterState("Dummy_Idle", new DummyState(character));
			return fsm;
		}
	}
}
