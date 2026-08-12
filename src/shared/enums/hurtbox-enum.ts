import { UUIDS } from "./config-enum";

export const HurtboxInstanceProperties = <const>{
	Size: new Vector3(3, 2, 3),
	Material: Enum.Material.ForceField,
	Shape: Enum.PartType.Cylinder,
	CanCollide: false,
	CastShadow: false,
	Transparency: 1,
	CanTouch: true,
	CanQuery: true,
	Massless: true,
	Anchored: false,
	CFrame: CFrame.Angles(0, 0, math.rad(90)),
	Color: new Color3(1, 0, 0),
};

export const HurtboxAttributes = <const>{
	UUID: UUIDS.Hurtbox,
};

export const HurtboxPositionProperties: Partial<Record<keyof AlignPosition, unknown>> = <const>{
	Enabled: true,
	RigidityEnabled: true,
	ReactionForceEnabled: true,
	Responsiveness: 100,
};
