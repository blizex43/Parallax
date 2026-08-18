import Object from "@rbxts/object-utils";
import { t } from "@rbxts/t";
// Instances
export const isInstance = t.Instance;
export const isModel = t.instanceIsA("Model");
export const isModuleScript = t.instanceIsA("ModuleScript");
export const isValueBase = t.instanceIsA("ValueBase");
export const isAttachment = t.instanceIsA("Attachment");
export const isWeld = t.instanceIsA("Weld");
export const isBoxHandleAdornment = t.instanceIsA("BoxHandleAdornment");
export const isBasePart = t.instanceIsA("BasePart");
export const isHumanoid = t.instanceIsA("Humanoid");
export const isFolder = t.instanceIsA("Folder");
export const isAnimation = t.instanceIsA("Animation");
export const isParticleEmitter = t.instanceIsA("ParticleEmitter");
export const isBeam = t.instanceIsA("Beam");
export const isTrail = t.instanceIsA("Trail");
export const isPlayer = t.instanceIsA("Player");
export const isDecal = t.instanceIsA("Decal");
export const isSound = t.instanceIsA("Sound");
export const isAccessory = t.instanceIsA("Accessory");
// Natives
export const isBoolean = t.boolean;
export const isNumber = t.number;
export const isString = t.string;
export const isNull = t.nil;
export const isObject = t.table;
export const isArray = t.array;
export const isFunction = t.callback;
export const isNativeDataType = t.union(isBoolean, isNumber, isString, isNull);
// Sub-Natives
export const isVector3 = t.Vector3;
export const isVector2 = t.Vector2;
export const isVector = t.union(isVector3, isVector2);
export const isColor3 = t.Color3;
export const isCFrame = t.CFrame;
export const isNumberSequence = t.NumberSequence;
// Non-T
export const isPromise = Promise.is;
// Custom
export const objectSize = (obj: object): number => Object.keys(obj).size();
export const isObjectWithAtLeast = (obj: unknown, amount: number) => isObject(obj) && objectSize(obj) >= amount;
export const isEmptyObject = (obj: unknown) => isObject(obj) && !isObjectWithAtLeast(obj, 1);
export const isDependerAtom = t.map(
	t.string,
	t.interface({
		start: t.number,
		end: t.optional(t.number),
	}),
);

export const isCooldownAtom = t.map(
	t.string,
	t.interface({
		start: t.number,
		end: t.number,
		halted: t.boolean,
	}),
);
