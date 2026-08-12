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
