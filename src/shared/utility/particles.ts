import type { EmittableTypes } from "shared/structs/particle";
import { isBeam, isParticleEmitter, isTrail } from "./t-isA";
export function emitDescendants(instance: Instance, count: number = 1): void {
	for (const child of instance.GetDescendants()) if (isParticleEmitter(child)) child.Emit(count);
}

export function enableDescendants(instance: Instance, enable: boolean = true): void {
	for (const child of getEmittableDescendants(instance)) child.Enabled = enable;
}

export function getEmittableDescendants(instance: Instance): EmittableTypes[] {
	const arr = <EmittableTypes[]>[];
	for (const child of instance.GetDescendants())
		if (isParticleEmitter(child) || isBeam(child) || isTrail(child)) arr.push(child);
	return arr;
}
