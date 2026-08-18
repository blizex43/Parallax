import { isEmpty } from "@rbxts/object-utils";
import { isString, isVector, isVector3 } from "./t-isA";

export function tovector<T extends Vector3 | Vector2 = Vector3>(value: unknown): Maybe<T> {
	if (!isString(value)) return;

	const match3 = value.match("^Vector3%((%-?%d+%.?%d*),%s*(%-?%d+%.?%d*),%s*(%-?%d+%.?%d*)%)");
	if (match3 && !isEmpty(match3)) {
		const [x, y, z] = (<string[]>match3).map((n) => tonumber(n));

		if (x && y && z) {
			return <T>new Vector3(x, y, z);
		}
	}

	const match2 = value.match("^Vector2%((%-?%d+%.?%d*),%s*(%-?%d+%.?%d*)");
	if (match2 && !isEmpty(match2)) {
		const [x, y] = (<string[]>match2).map((n) => tonumber(n));
		if (x && y) {
			return <T>new Vector2(x, y);
		}
	}

	return;
}
export function vectortostring(value: unknown): Maybe<string> {
	return isVector(value)
		? `${isVector3(value) ? "Vector3" : "Vector2"}(${value.X}, ${value.Y}${isVector3(value) ? `, ${value.Z}` : ``})`
		: undefined;
}

export function isBackTurned(selfRoot: BasePart, enemyRoot: BasePart, threshhold: number): boolean {
	return -getDot(flatten(getLook(selfRoot)), flatten(getLook(enemyRoot))) < threshhold;
}

export function getDot(unit: Vector3, lookVector: Vector3): number {
	return unit.Dot(lookVector);
}

export function getLook(base: BasePart) {
	return base.CFrame.LookVector;
}

export function flatten(v: Vector3, flattenX: boolean = false): Vector3 {
	return new Vector3(flattenX ? 0 : v.X, 0, v.Z).Unit;
}

export function toRelativeVector(cf: CFrame, baseVector: Vector3): Vector3 {
	return cf.VectorToObjectSpace(baseVector);
}

export function toWorldVector(cf: CFrame, baseVector: Vector3): Vector3 {
	return cf.VectorToWorldSpace(baseVector);
}

export function distance(position: Vector3, position2: Vector3): number {
	return position2.sub(position).Magnitude;
}
