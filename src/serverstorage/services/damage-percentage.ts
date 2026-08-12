import { OnInit, Service } from "@flamework/core";
import { Janitor } from "@rbxts/janitor";
import type { OnCharmManagerCreated, OnCharmManagerDestroyed } from "serverstorage/hooks";
import type { WebsocketUtilities } from "shared/classes/websocket-utilities";
import type { WebsocketManagementService } from "./websocket-manager";
import { DamagePercentageType, ManagerCleanType } from "shared/enums/damage-percentage-enum";
import { DamageNotifyService } from "./damage-notify";
import Log from "shared/log";
import { isModel } from "shared/utility/t-isA";
import Signal from "@rbxts/signal";
import { CombatState } from "shared/enums/config-enum";
import { Players } from "@rbxts/services";
@Service()
export class DamagePercentageService implements OnInit, OnCharmManagerCreated, OnCharmManagerDestroyed {
	private readonly currentManagers: Map<Plaracter, ManagerCleanType> = new Map();
	private readonly currentDamagePercentages: Map<CharacterModel, DamagePercentageType> = new Map();
	private readonly percentageAdded: Signal<(character: CharacterModel) => void> = new Signal();
	private readonly percentageRemoving: Signal<(character: CharacterModel) => void> = new Signal();
	public constructor(
		private readonly ws: WebsocketManagementService,
		private readonly notify: DamageNotifyService,
	) { }

	public onInit(): void {
		this.listenToOnDamaged();
		this.listenForCombatTag();
	}
	public onCharmManagerCreated(plaracter: Plaracter, manager: WebsocketUtilities): void {
		const janitor = new Janitor();
		this.saveManager(plaracter, manager, janitor);
	}

	public onCharmManagerDestroyed(plaracter: Plaracter): void {
		this.removeManager(plaracter, true);
	}

	private savePercentage(character: CharacterModel, obj: DamagePercentageType): DamagePercentageType {
		this.currentDamagePercentages.set(character, obj);
		this.percentageAdded.Fire(character);
		return obj;
	}

	private saveManager(plaracter: Plaracter, manager: WebsocketUtilities, janitor: Janitor): void {
		return void this.currentManagers.set(plaracter, { manager, janitor });
	}

	private getPercentage(character: CharacterModel): Maybe<DamagePercentageType> {
		return this.currentDamagePercentages.get(character);
	}

	private getManager(plaracter: Plaracter): Maybe<ManagerCleanType> {
		return this.currentManagers.get(plaracter);
	}

	private removePercentage(character: CharacterModel): void {
		this.percentageRemoving.Fire(character);
		return void this.currentDamagePercentages.delete(character);
	}

	private removeManager(plaracter: Plaracter, clean: boolean = true): void {
		const character = <Maybe<CharacterModel>>(isModel(plaracter) ? plaracter : plaracter.Character);
		const manager = this.getManager(plaracter);
		if (manager) {
			if (clean) manager.janitor.Destroy();
			if (character && this.getPercentage(character)) this.removePercentage(character);
		}
		return void this.currentManagers.delete(plaracter);
	}

	private listenToOnDamaged(): void {
		return void this.notify.notifyOnDamaged.Connect((ctx, _, n) => {
			// Log.info(`${ctx}, ${n}`, ["NOTIFIER"]);
			const { attacker, attacked } = ctx;
			const player = Players.GetPlayerFromCharacter(attacked.character);
			if (!this.getManager(player ? player : attacked.character)) return;
			const parentPercentage =
				this.getPercentage(attacked.character) ?? this.savePercentage(attacked.character, new Map());
			const percentage = parentPercentage.get(attacker.character) ?? {
				damage: 0,
			};
			percentage.damage += n;
			if (!parentPercentage.has(attacker.character)) parentPercentage.set(attacker.character, percentage);
			print(percentage.damage);
		});
	}

	private onCombatStatusChanged(character: CharacterModel, manager: ManagerCleanType, on: boolean) {
		if (on) return;
		print("Cleaning up!", on);
		manager.janitor.Cleanup();
		if (this.getPercentage(character)) this.removePercentage(character);
	}

	private listenForCombatTag(): void {
		return void this.percentageAdded.Connect((character) => {
			const manager = this.getManager(character);
			if (!manager) return;
			manager.janitor.Add(
				(
					this.ws.getCharm<boolean>(character, CombatState.CombatTag) ??
					manager.manager.get(CombatState.CombatTag)
				).changed.Connect((value) => this.onCombatStatusChanged(character, manager, value)),
			);
		});
	}
}
