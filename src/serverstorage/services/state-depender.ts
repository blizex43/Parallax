import { Service } from "@flamework/core";
import type { OnCharacterAdd, OnCharacterRemove } from "shared/hooks";
import type { RagdollService } from "./ragdoll";
import type { WebsocketManagementService } from "./websocket-manager";
import { SpawnTask } from "shared/decorators";
import type { WebsocketUtilities } from "shared/classes/websocket-utilities";
import { Janitor } from "@rbxts/janitor";
import { stringHas } from "shared/utility/strings";
import { isFunction, isString } from "shared/utility/t-isA";
import { CombatState, MiscState, MovementState } from "shared/enums/config-enum";
import type { BlockService } from "./block";
import { proto } from "shared/utility/classes";
import { Events } from "serverstorage/network";
import { Serializers } from "shared/network";
import type { SprintService } from "./sprint";
import { DashProperties } from "shared/enums/push-enum";
import type { DashService } from "./dash";
import { DependerAtom } from "shared/structs/atom";
import Log from "shared/log";

@Service()
export class StateDependerService implements OnCharacterAdd, OnCharacterRemove {
	private readonly cache: Map<CharacterModel, Janitor> = new Map();
	public constructor(
		private readonly ragdoll: RagdollService,
		private readonly block: BlockService,
		private readonly ws: WebsocketManagementService,
		private readonly sprint: SprintService,
		private readonly dash: DashService,
	) {}

	@SpawnTask()
	public onCharacterAdd(character: CharacterModel): void {
		const manager = this.ws.getManager(character);
		if (!manager) return;
		this.run(character, manager);
	}
	@SpawnTask()
	public onCharacterRemove(character: CharacterModel): void {
		this.reset(character);
	}

	public depend_combat_tag(character: CharacterModel, manager: WebsocketUtilities) {
		const combatTagAccumuator = manager.get<DependerAtom>(CombatState.CombatTagAccumulator);
		const combatTag = manager.get<boolean>(CombatState.CombatTag);
		combatTag.__janitor.Add(
			combatTagAccumuator.changed.Connect(() => {
				const newValue = !this.ws.getDependerTrueStateValue(character, CombatState.CombatTagAccumulator);
				print(newValue, this.ws.getStateValue(character, CombatState.CombatTagAccumulator));
				if (this.ws.getStateValue(character, CombatState.CombatTag) !== newValue)
					this.ws.setState(character, CombatState.CombatTag, newValue);
			}),
		);
		combatTag.__janitor.Add(combatTag.changed.Connect((on) => Log.info(`${on}`, ["Combat Tag"])));
	}

	public depend_ragdoll(character: CharacterModel, manager: WebsocketUtilities): void {
		const ragdolled = manager.get<boolean>(CombatState.Ragdoll);
		const knocked = manager.get<boolean>(CombatState.Knocked);
		const exhausted = manager.get<boolean>(CombatState.Exhausted); // Temporarily Ragdolls for now
		ragdolled.__janitor.Add(
			ragdolled.changed.Connect((newValue) =>
				newValue
					? this.ragdoll.ragdoll(character, { keepVelocity: true })
					: !knocked.status
						? this.ragdoll.deragdoll(character)
						: undefined,
			),
		);
		knocked.__janitor.Add(
			knocked.changed.Connect((newValue) =>
				newValue
					? this.ragdoll.ragdoll(character, { keepVelocity: true })
					: !ragdolled.status
						? this.ragdoll.deragdoll(character)
						: undefined,
			),
		);
		exhausted.__janitor.Add(
			exhausted.changed.Connect((newValue) =>
				newValue
					? this.ragdoll.ragdoll(character, { keepVelocity: true })
					: !ragdolled.status
						? this.ragdoll.deragdoll(character)
						: undefined,
			),
		);
	}

	public depend_dash(character: CharacterModel, manager: WebsocketUtilities): void {
		const dash = manager.get<boolean>(MovementState.Dash);
		dash.__janitor.Add(
			Events.game.dash.connect((player, { buffer, blobs }) => {
				const packet = Serializers.dash.deserialize(buffer, blobs);
				if (!packet.on) return;
				if (player.Character === character)
					this.ws.setStateFor(character, MovementState.Dash, packet.on, DashProperties.Cooldown, false, true);
			}),
		);
		dash.__janitor.Add(dash.changed.Connect((value) => this.dash.handleDash(character, value)));
	}

	public depend_sprint(character: CharacterModel, manager: WebsocketUtilities): void {
		const sprint = manager.get<boolean>(MovementState.Sprint);
		sprint.__janitor.Add(
			Events.game.sprint.connect((player, { buffer, blobs }) => {
				const packet = Serializers.sprint.deserialize(buffer, blobs);
				if (player.Character === character) this.ws.setState(character, MovementState.Sprint, packet.on);
			}),
		);
		sprint.__janitor.Add(sprint.changed.Connect((value) => this.sprint.handleSprint(character, value)));
	}

	public depend_block(character: CharacterModel, manager: WebsocketUtilities): void {
		const block = manager.get<boolean>(CombatState.Block);
		const blockBroken = manager.get<boolean>(CombatState.BlockBroken);
		block.__janitor.Add(
			Events.game.block.connect((player, { buffer, blobs }) => {
				const packet = Serializers.block.deserialize(buffer, blobs);
				if (player.Character === character && !blockBroken.status)
					this.ws.setState(character, CombatState.Block, packet.on);
			}),
		);
		block.__janitor.Add(block.changed.Connect((value) => this.block.handleBlock(character, value)));
		blockBroken.__janitor.Add(blockBroken.changed.Connect(() => this.block.handleBlock(character, false)));
	}

	private run(character: CharacterModel, manager: WebsocketUtilities) {
		for (const [name, value] of pairs(proto(this)))
			if (isString(name) && stringHas(name, "depend") && isFunction(value)) value(this, character, manager);
	}

	private reset(character: CharacterModel) {
		this.ws.setState(character, CombatState.Ragdoll, false);
		this.ws.setState(character, CombatState.Block, false);
		this.ws.setState(character, CombatState.BlockBroken, false);
		this.ws.setState(character, CombatState.CombatEquip, false);
		this.ws.setState(character, CombatState.Windup, false);
		this.ws.setState(character, CombatState.Attacking, false);
		this.ws.setState(character, CombatState.Recovery, false);
		this.ws.setState(character, CombatState.Exhausted, false);
		this.ws.setState(character, CombatState.Stunned, false);
		this.ws.setState(character, CombatState.FullStunned, false);
		this.ws.setState(character, CombatState.Knocked, false);
		this.ws.setState(character, CombatState.StopHealthRegen, false);
		this.ws.setState(character, MovementState.Sprint, false);
		this.ws.setState(character, CombatState.Exhausted, false);
		this.ws.setState(character, MiscState.Cutscene, false);
	}
}
