import { Service } from "@flamework/core";
import { ServerStorage } from "@rbxts/services";
import type { OnCharacterAdd, OnCharacterRemove } from "shared/hooks";
import type { NestService } from "./nest";
import { isDecal } from "shared/utility/t-isA";

@Service()
export class FakeHeadService implements OnCharacterAdd, OnCharacterRemove {
	private readonly fakeHeadFolder = ServerStorage.Assets.FakeHead;
	private readonly fakeHeadContainer: Map<CharacterModel, FakeHeadInstance> = new Map();
	constructor(private readonly nest: NestService) {}
	public onCharacterAdd(character: CharacterModel): void {
		const head = character.Head;
		const _head = this.constructHeadFromHead(head);
		this.removeHeadDecals(head);
		this.centerHeadInHead(_head, head);
		this.set(character, _head);
	}
	public onCharacterRemove(character: CharacterModel): void {
		this.remove(character);
	}

	public get(character: CharacterModel): Maybe<FakeHeadInstance> {
		return this.fakeHeadContainer.get(character);
	}

	public set(character: CharacterModel, fakeHead: FakeHeadInstance): void {
		return void this.fakeHeadContainer.set(character, fakeHead);
	}

	public remove(character: CharacterModel): void {
		const currentHead = this.fakeHeadContainer.get(character);
		if (currentHead) currentHead.Destroy();
		return void this.fakeHeadContainer.delete(character);
	}

	private constructHeadFromHead(head: BasePart): FakeHeadInstance {
		const _head = this.fakeHeadFolder.Head.Clone();
		_head.Parent = this.nest.getReserved("FakeHeads");
		this.weldHeadToHead(_head, head);
		return _head;
	}

	private removeHeadDecals(head: BasePart): void {
		for (const instance of head.GetChildren()) if (isDecal(instance)) instance.Destroy();
	}

	private centerHeadInHead(fakeHead: FakeHeadInstance, head: BasePart): void {
		fakeHead.CFrame = head.CFrame;
	}

	private weldHeadToHead(fakeHead: FakeHeadInstance, head: BasePart): void {
		fakeHead.WeldConstraint.Part0 = fakeHead;
		fakeHead.WeldConstraint.Part1 = head;
	}
}
