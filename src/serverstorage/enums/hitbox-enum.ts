import { UUIDS } from "shared/enums/config-enum";
import type { HurtboxAttributes } from "shared/structs/hitbox";
import type { Settings } from "shared/forks/shapecasthitbox/Settings";
import type { CastData } from "shared/forks/shapecasthitbox/Types";
export const HitboxStudioSettings: Partial<Record<keyof Settings, unknown>> = {
	Debug_Visible: true,
	Debug_Instance_Transparency: 1,
	Debug_Instance_Color: new Color3(0.76, 0.01, 0.01),
};

export const HitboxAttributes: CastData & HurtboxAttributes = {
	UUID: UUIDS.Hitbox,
	duration: 1,
	forceHurtboxDetection: true,
	maxQueryable: 1,
	CastType: "Blockcast",
	CFrame: new CFrame(0, 0, -1),
	Size: new Vector3(5, 5, 6.5),
	Radius: 5,
};

export const HitboxHandleAttributes = <const>{
	Name: "HitboxAnchor",
	Anchored: false,
	CanCollide: false,
	CanQuery: false,
	CanTouch: false,
	Transparency: 1,
	Size: new Vector3(0.1, 0.1, 0.1),
};
