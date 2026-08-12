import { type OnInit, Service } from "@flamework/core";
import { Workspace as World } from "@rbxts/services";
import { t } from "@rbxts/t";
import { TagHandler } from "shared/classes/tag";
import { NestDescendantChanged } from "shared/constants";
import { DeferTask } from "shared/decorators";
import { ReservedNests } from "shared/enums/nest-enum";
import { LogStart, OnCharacterAdd, OnCharacterRemove } from "shared/hooks";
import type { ReservedNestType } from "shared/structs/nest";
import { Create } from "shared/utility/instance";

@Service()
export class NestService extends TagHandler implements LogStart, OnCharacterAdd, OnCharacterRemove, OnInit {
	private readonly nestName = "Nest";
	protected tag: string = "[Nest]";
	public nest!: Folder;
	private reservedNests = <Record<ReservedNestType, Folder>>{};

	public async onInit(): Promise<void> {
		this.nest = Create("Folder", this.nestName, World);
		this.setReserved();
	}

	@DeferTask()
	public onCharacterAdd(character: CharacterModel): void {
		this.set(character);
		NestDescendantChanged.Fire(character, this.nest, true);
	}

	public onCharacterRemove(character: CharacterModel): void {
		this.remove(character);
		NestDescendantChanged.Fire(character, this.nest, false);
	}

	public getMemberOf(name: string, nest: ReservedNestType | Folder = this.nest): Maybe<Instance> {
		if (!t.Instance(nest)) nest = this.getNest(nest);
		return nest.FindFirstChild(name);
	}

	public isAMember(instance: Instance, nest: ReservedNestType | Folder = this.nest): boolean {
		if (!t.Instance(nest)) nest = this.getNest(nest);
		return instance.IsDescendantOf(nest);
	}

	public getReserved(reservedName: ReservedNestType) {
		return this.reservedNests[reservedName];
	}

	private getNest(nest: ReservedNestType) {
		return this.reservedNests[nest];
	}

	private setReserved() {
		for (const reserved of ReservedNests) {
			this.reservedNests[reserved] = Create("Folder", reserved, World);
		}
	}
	private set(character: CharacterModel) {
		character.Parent = this.nest;
		this.give(character);
	}
}
