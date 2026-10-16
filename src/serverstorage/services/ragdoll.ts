import { Service } from "@flamework/core";
import { Falldown, IActiveRagdoll } from "@rbxts/falldown";
import type { LogStart, OnCharacterRemove } from "shared/hooks";
import { Janitor } from "@rbxts/janitor";
import { $nameof, $warn } from "rbxts-transform-debug";
import { MarkForRemoval } from "shared/constants";
import type { RagdollProperties } from "shared/structs/ragdoll";

interface NeckJointOffsets {
	part0: BasePart;
	part1: BasePart;
	c0: CFrame;
	c1: CFrame;
}

interface RagdollData {
	ragdoll: IActiveRagdoll;
	janitor: Janitor;
	duration: Maybe<number>;
	schedule: Maybe<Promise<void>>;
}
@Service()
export class RagdollService implements LogStart, OnCharacterRemove {
	private readonly ragdolls: Map<CharacterModel, RagdollData> = new Map();
	private readonly velocityMode = Falldown.VelocityMode.SplitEqual;
	// private readonly exitMode = Falldown.ExitMode.Immediate;

	public onCharacterRemove(character: CharacterModel): void {
		this.deragdoll(character, true);
	}

	public ragdoll(character: CharacterModel, properties: RagdollProperties): Maybe<RagdollData> {
		const neckOffsets = this.getNeckJointOffsets(character);
		const ragdoll = Falldown.RagdollCharacter(character, 0);
		if (!ragdoll) return;
		if (neckOffsets) this.applyNeckJointOffsets(neckOffsets);
		this.eraseSchedule(character);
		const janitor = new Janitor();
		const ragdollData = <RagdollData>{ ragdoll, janitor, duration: properties.duration };
		let vector = Vector3.zero;
		if (properties.keepVelocity) vector = vector.add(character.HumanoidRootPart.AssemblyLinearVelocity);
		if (properties.velocity) vector = vector.add(properties.velocity);
		if (properties.duration) {
			ragdollData.schedule = this.scheduleDeragdoll(character, properties.duration);
		}
		ragdoll.AddVelocity(vector, this.velocityMode);
		janitor.Add(() => ragdoll.Destroyed && [ragdoll.Destroy()]);
		this.addToRotation(character, ragdollData);
		return ragdollData;
	}

	public addVectorToRagdoll(character: CharacterModel, vector: Vector3): void {
		const { ragdoll } = this.getFromRotation(character)!;
		if (!ragdoll) return;
		ragdoll.AddVelocity(vector, this.velocityMode);
	}

	public deragdoll(character: CharacterModel, erasePromise: boolean = true): void {
		const ragdollData = this.getFromRotation(character)!;
		if (!ragdollData) return;
		ragdollData.janitor.Cleanup();
		if (!character.FindFirstChild("HumanoidRootPart")) MarkForRemoval.Fire(character);
		if (erasePromise) this.eraseSchedule(character);
		this.removeToRotation(character);
	}

	public changeDuration(character: CharacterModel, duration: number): void {
		const data = this.getFromRotation(character)!;
		if (!data) return;
		data.duration = duration;
		this.eraseSchedule(character);
		data.schedule = this.scheduleDeragdoll(character, duration);
	}

	public isRagdolled(character: CharacterModel): boolean {
		return this.ragdolls.has(character);
	}

	private getFromRotation(character: CharacterModel): Maybe<RagdollData> {
		return this.ragdolls.get(character);
	}

	private getNeckJointOffsets(character: CharacterModel): Maybe<NeckJointOffsets> {
		const neck = character.FindFirstChild("Neck", true);
		if (!neck?.IsA("Motor6D") || !neck.Part0 || !neck.Part1) return;
		return { part0: neck.Part0, part1: neck.Part1, c0: neck.C0, c1: neck.C1 };
	}

	private applyNeckJointOffsets(offsets: NeckJointOffsets): void {
		const attachment0 = offsets.part0.FindFirstChild("Neck_Attachment0");
		const attachment1 = offsets.part1.FindFirstChild("Neck_Attachment1");
		if (attachment0?.IsA("Attachment")) attachment0.CFrame = offsets.c0;
		if (attachment1?.IsA("Attachment")) attachment1.CFrame = offsets.c1;
	}

	private addToRotation(character: CharacterModel, data: RagdollData): void {
		return void this.ragdolls.set(character, data);
	}

	private removeToRotation(character: CharacterModel): void {
		return void this.ragdolls.delete(character);
	}

	private eraseSchedule(character: CharacterModel): void {
		const ragdollData = this.getFromRotation(character);
		if (!ragdollData) return;
		if (ragdollData.schedule && ragdollData.schedule.getStatus() === "Started") ragdollData.schedule.cancel();
	}

	private async scheduleDeragdoll(character: CharacterModel, waitTime: number): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			task.wait(waitTime);
			if (!character) reject(`Error Scheduling deragdoll in ${$nameof<RagdollService>()}`);
			resolve(this.deragdoll(character, false));
		}).catch((reason: string) => $warn(reason));
	}
}
