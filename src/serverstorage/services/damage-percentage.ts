import { OnInit, Service } from "@flamework/core";
import { Janitor } from "@rbxts/janitor";
import type { JournalCleanType, DamagePercentageType } from "shared/enums/damage-percentage-enum";
import { DamageNotifyService } from "./damage-notify";
import Log from "shared/log";
import { isModel } from "shared/utility/t-isA";
import Signal from "@rbxts/signal";
import { CombatState } from "shared/enums/config-enum";
import { Players } from "@rbxts/services";
import type { JournalService } from "./journal";
@Service()
export class DamagePercentageService implements OnInit {
	private readonly currentJournals: Map<Plaracter, JournalCleanType> = new Map();
	private readonly currentDamagePercentages: Map<CharacterModel, DamagePercentageType> = new Map();
	private readonly percentageAdded: Signal<(character: CharacterModel) => void> = new Signal();
	private readonly percentageRemoving: Signal<(character: CharacterModel) => void> = new Signal();
	public constructor(
		private readonly journal: JournalService,
		private readonly notify: DamageNotifyService,
	) { }

	public onInit(): void {
		this.listenToOnDamaged();
		this.listenForCombatTag();
		this.journal.journalCreated.Connect((plaracter) => this.saveJournal(plaracter));
		this.journal.journalDestroying.Connect((plaracter) => this.removeJournal(plaracter));
	}

	private savePercentage(character: CharacterModel, obj: DamagePercentageType): DamagePercentageType {
		this.currentDamagePercentages.set(character, obj);
		this.percentageAdded.Fire(character);
		return obj;
	}

	private saveJournal(plaracter: Plaracter): void {
		this.currentJournals.set(plaracter, { janitor: new Janitor() });
	}

	private getPercentage(character: CharacterModel): Maybe<DamagePercentageType> {
		return this.currentDamagePercentages.get(character);
	}

	private getJournal(plaracter: Plaracter): Maybe<JournalCleanType> {
		return this.currentJournals.get(plaracter);
	}

	private removePercentage(character: CharacterModel): void {
		this.percentageRemoving.Fire(character);
		return void this.currentDamagePercentages.delete(character);
	}

	private removeJournal(plaracter: Plaracter): void {
		const character = <Maybe<CharacterModel>>(isModel(plaracter) ? plaracter : plaracter.Character);
		const journal = this.getJournal(plaracter);
		if (journal) {
			journal.janitor.Destroy();
			if (character && this.getPercentage(character)) this.removePercentage(character);
		}
		return void this.currentJournals.delete(plaracter);
	}

	private listenToOnDamaged(): void {
		return void this.notify.notifyOnDamaged.Connect((ctx, _, n) => {
			// Log.info(`${ctx}, ${n}`, ["NOTIFIER"]);
			const { attacker, attacked } = ctx;
			const player = Players.GetPlayerFromCharacter(attacked.character);
			if (!this.getJournal(player ? player : attacked.character)) return;
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

	private onCombatStatusChanged(character: CharacterModel, journal: JournalCleanType, on: boolean) {
		if (on) return;
		print("Cleaning up!", on);
		journal.janitor.Cleanup();
		if (this.getPercentage(character)) this.removePercentage(character);
	}

	private listenForCombatTag(): void {
		return void this.percentageAdded.Connect((character) => {
			const player = Players.GetPlayerFromCharacter(character);
			const journal = this.getJournal(player ?? character);
			const changed = this.journal.fetchStateChanged<boolean>(character, CombatState.CombatTag);
			if (!journal || !changed) return;
			journal.janitor.Add(
				changed.Connect(({ newValue }) => this.onCombatStatusChanged(character, journal, newValue)),
			);
		});
	}
}
