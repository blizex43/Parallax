import { Service } from "@flamework/core";
import type { OnCharacterAdd, OnCharacterRemove } from "shared/hooks";
import type { RagdollService } from "./ragdoll";
import { SpawnTask } from "shared/decorators";
import { Janitor } from "@rbxts/janitor";
import { isEmpty } from "@rbxts/object-utils";
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
import type { JournalService } from "./journal";
import type { JournalUtil } from "shared/classes/journal-util";

@Service()
export class StateDependerService implements OnCharacterAdd, OnCharacterRemove {
	private readonly cache: Map<CharacterModel, Janitor> = new Map();
	public constructor(
		private readonly ragdoll: RagdollService,
		private readonly block: BlockService,
		private readonly journal: JournalService,
		private readonly sprint: SprintService,
		private readonly dash: DashService,
	) { }

	@SpawnTask()
	public onCharacterAdd(character: CharacterModel): void {
		const util = this.journal.fetchUtil(character);
		if (!util) return;
		const janitor = new Janitor();
		this.cache.set(character, janitor);
		this.run(character, util, janitor);
	}
	@SpawnTask()
	public onCharacterRemove(character: CharacterModel): void {
		this.reset(character);
		this.cache.get(character)?.Destroy();
		this.cache.delete(character);
	}

	public depend_combat_tag(character: CharacterModel, util: JournalUtil, janitor: Janitor) {
		janitor.Add(
			util.getPathChanged<DependerAtom>(CombatState.CombatTagAccumulator).Connect(() => {
				const accumulator = util.read<DependerAtom>(CombatState.CombatTagAccumulator) ?? {};
				const newValue = isEmpty(accumulator);
				if (util.read<boolean>(CombatState.CombatTag) !== newValue)
					this.journal.writeStateValue(character, CombatState.CombatTag, newValue);
			}),
		);
		janitor.Add(
			util
				.getPathChanged<boolean>(CombatState.CombatTag)
				.Connect(({ newValue }) => Log.info(`${newValue}`, ["Combat Tag"])),
		);
	}

	public depend_ragdoll(character: CharacterModel, util: JournalUtil, janitor: Janitor): void {
		janitor.Add(
			util
				.getPathChanged<boolean>(CombatState.Ragdoll)
				.Connect(({ newValue }) =>
					newValue
						? this.ragdoll.ragdoll(character, { keepVelocity: true })
						: !util.read<boolean>(CombatState.Knocked)
							? this.ragdoll.deragdoll(character)
							: undefined,
				),
		);
		janitor.Add(
			util
				.getPathChanged<boolean>(CombatState.Knocked)
				.Connect(({ newValue }) =>
					newValue
						? this.ragdoll.ragdoll(character, { keepVelocity: true })
						: !util.read<boolean>(CombatState.Ragdoll)
							? this.ragdoll.deragdoll(character)
							: undefined,
				),
		);
		janitor.Add(
			util
				.getPathChanged<boolean>(CombatState.Exhausted)
				.Connect(({ newValue }) =>
					newValue
						? this.ragdoll.ragdoll(character, { keepVelocity: true })
						: !util.read<boolean>(CombatState.Ragdoll)
							? this.ragdoll.deragdoll(character)
							: undefined,
				),
		);
	}

	public depend_dash(character: CharacterModel, util: JournalUtil, janitor: Janitor): void {
		janitor.Add(
			Events.game.dash.connect((player, { buffer, blobs }) => {
				const packet = Serializers.dash.deserialize(buffer, blobs);
				if (!packet.on) return;
				if (player.Character === character)
					util.writeFor(MovementState.Dash, packet.on, DashProperties.Cooldown, false, true);
			}),
		);
		janitor.Add(
			util
				.getPathChanged<boolean>(MovementState.Dash)
				.Connect(({ newValue }) => this.dash.handleDash(character, newValue)),
		);
	}

	public depend_sprint(character: CharacterModel, util: JournalUtil, janitor: Janitor): void {
		janitor.Add(
			Events.game.sprint.connect((player, { buffer, blobs }) => {
				const packet = Serializers.sprint.deserialize(buffer, blobs);
				if (player.Character === character)
					this.journal.writeStateValue(character, MovementState.Sprint, packet.on);
			}),
		);
		janitor.Add(
			util
				.getPathChanged<boolean>(MovementState.Sprint)
				.Connect(({ newValue }) => this.sprint.handleSprint(character, newValue)),
		);
	}

	public depend_block(character: CharacterModel, util: JournalUtil, janitor: Janitor): void {
		janitor.Add(
			Events.game.block.connect((player, { buffer, blobs }) => {
				const packet = Serializers.block.deserialize(buffer, blobs);
				if (player.Character === character && !util.read<boolean>(CombatState.BlockBroken))
					this.journal.writeStateValue(character, CombatState.Block, packet.on);
			}),
		);
		janitor.Add(
			util
				.getPathChanged<boolean>(CombatState.Block)
				.Connect(({ newValue }) => this.block.handleBlock(character, newValue)),
		);
		janitor.Add(
			util
				.getPathChanged<boolean>(CombatState.BlockBroken)
				.Connect(() => this.block.handleBlock(character, false)),
		);
	}

	private run(character: CharacterModel, util: JournalUtil, janitor: Janitor) {
		for (const [name, value] of pairs(proto(this)))
			if (isString(name) && stringHas(name, "depend") && isFunction(value)) value(this, character, util, janitor);
	}

	private reset(character: CharacterModel) {
		this.journal.writeStateValue(character, CombatState.Ragdoll, false);
		this.journal.writeStateValue(character, CombatState.Block, false);
		this.journal.writeStateValue(character, CombatState.BlockBroken, false);
		this.journal.writeStateValue(character, CombatState.CombatEquip, false);
		this.journal.writeStateValue(character, CombatState.Windup, false);
		this.journal.writeStateValue(character, CombatState.Attacking, false);
		this.journal.writeStateValue(character, CombatState.Recovery, false);
		this.journal.writeStateValue(character, CombatState.Exhausted, false);
		this.journal.writeStateValue(character, CombatState.Stunned, false);
		this.journal.writeStateValue(character, CombatState.FullStunned, false);
		this.journal.writeStateValue(character, CombatState.Knocked, false);
		this.journal.writeStateValue(character, CombatState.StopHealthRegen, false);
		this.journal.writeStateValue(character, MovementState.Sprint, false);
		this.journal.writeStateValue(character, CombatState.Exhausted, false);
		this.journal.writeStateValue(character, MiscState.Cutscene, false);
	}
}
