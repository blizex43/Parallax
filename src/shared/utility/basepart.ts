import { RaycastParamsBuilder } from "@rbxts/builders";
import { isAttachment, isBasePart } from "./t-isA";
import { Workspace as World } from "@rbxts/services";
import { CharacterLimbsType } from "shared/structs/model";
import { CharacterLimbs } from "shared/enums/model-enum";

export function BreakJointsOfCharacter(character: CharacterModel): void {
	for (const limb of character.GetChildren<BasePart>())
		if (isBasePart(limb)) for (const joint of limb.GetJoints()) joint.Destroy();
}

export function getGroundMaterial(humanoid: Humanoid, allowed?: Enum.Material[]): Maybe<Enum.Material> {
	return !allowed
		? humanoid.FloorMaterial
		: allowed.includes(humanoid.FloorMaterial)
			? humanoid.FloorMaterial
			: undefined;
}

export function getGroundMaterialFromRaycast(
	pos: Vector3,
	direction: Vector3,
	power: number,
	rayParams?: RaycastParams,
): Maybe<Enum.Material> {
	rayParams ??= new RaycastParamsBuilder().Build();
	const raycast = World.Raycast(pos, direction.mul(power), rayParams);
	return raycast?.Material;
}

export function getMassOfModel(model: Model): number {
	let mass = 0;
	for (const descendant of model.GetDescendants()) if (isBasePart(descendant)) mass += descendant.GetMass();
	return mass;
}

export function isMovingBackwards(root: BasePart, humanoid: Humanoid, threshhold: number = -0.65) {
	if (humanoid.MoveDirection.Magnitude > 0) {
		const dir = root.CFrame.LookVector.Dot(humanoid.MoveDirection);
		if (dir < threshhold) return true;
	}
	return false;
}

export function getHeightFromHumanoid(humanoid: Humanoid): number {
	return humanoid.HipHeight + 1;
}

export function getHeightDifferenceFromCharacters(...characters: CharacterModel[]): number {
	const heights = characters.map((character) => getHeightFromHumanoid(character.Humanoid));

	return math.max(...heights) - math.min(...heights);
}

export function getCharacterLimbs(
	character: Model,
	allowedLimbs: readonly CharacterLimbsType[] = CharacterLimbs,
): BasePart[] {
	const limbs = <BasePart[]>[];
	for (const instance of character.GetChildren()) {
		if (isBasePart(instance) && allowedLimbs.includes(<CharacterLimbsType>instance.Name)) {
			limbs.push(instance);
		}
	}
	return limbs;
}

export function getChildAttachments(
	character: Model,
	attachmentName: string,
	allowedLimbs?: readonly CharacterLimbsType[],
): Attachment[] {
	const attachments = <Attachment[]>[];
	for (const instance of getCharacterLimbs(character, allowedLimbs)) {
		const attachment = instance.FindFirstChild(attachmentName);
		if (attachment && isAttachment(attachment)) attachments.push(attachment);
	}
	return attachments;
}
