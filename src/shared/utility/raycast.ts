import { RaycastParamsBuilder } from "@rbxts/builders";
import { Workspace as World } from "@rbxts/services";

export function getRaycastLine(
	origin: CFrame,
	direction: "right" | "left" | "up" | "down",
	power: number,
	blacklist: Instance[] = [],
): Maybe<Vector3> {
	let dirVector: Vector3;
	switch (direction) {
		case "right":
			dirVector = origin.RightVector;
			break;
		case "left":
			dirVector = origin.RightVector.mul(-1);
			break;
		case "up":
			dirVector = origin.UpVector;
			break;
		case "down":
			dirVector = origin.UpVector.mul(-1);
			break;
	}
	return World.Raycast(
		origin.Position,
		dirVector.mul(power),
		new RaycastParamsBuilder()
			.AddToFilter(...blacklist)
			.SetIgnoreWater(true)
			.Build(),
	)?.Position;
}
