import { type ILazy, Lazy } from "@rbxts/lazy";
import { Heavy } from "serverstorage/services/sub-services/Heavy";
import { Light } from "serverstorage/services/sub-services/Light";
import type { RegisteredAttacksType } from "shared/structs/attack";
export const RegisteredAttacks: ILazy<RegisteredAttacksType> = new Lazy(() => ({
	Light: new Light(),
	Heavy: new Heavy(),
}));
