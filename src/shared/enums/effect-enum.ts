import { ReplicatedStorage } from "@rbxts/services";
import type { EffectContext, EffectName } from "shared/structs/effect";

// Add effect names to EffectTable, then configure their asset and playback here.
// Simple effects use CatalogEffect automatically; add keyframes to chain other effects.
export const EffectTable = <const>[
	"Footstep",
	"Basic-Trail",
	"Star-Trail",
	"Guard-Break",
	"Critical-Hit",
	"Black-Trail",
	"Light-Hit",
	"Clash",
	"Dash",
];

export const EffectCatalog: Record<EffectName, EffectContext> = {
	Footstep: {
		handler: "footstep",
		particleReference: {
			reference: ReplicatedStorage.Assets.VFX.Movement.Footstep.FindFirstChild("FootStepFx")!,
			emissionType: "Emit",
			position: "Floor",
			offset: new Vector3(0, 0.5, 0),
			power: 6,
			emissions: 1,
			isForged: true,
			variants: ["Normal", "Wet", "Grassy"],
		},
		soundReference: {
			reference: ReplicatedStorage.Assets.Sounds.Footstep,
			variants: ["Concrete", "Wood", "Grass", "Sand", "Dirt"],
		},
	},
	"Basic-Trail": {
		particleReference: {
			reference: ReplicatedStorage.Assets.VFX.Combat.Trails.FindFirstChild<Attachment>("Basic")!,
			emissionType: "Enable",
			attach: "PalmAttachment",
		},
	},
	"Black-Trail": {
		particleReference: {
			reference: ReplicatedStorage.Assets.VFX.Combat.Trails.FindFirstChild<Attachment>("Black")!,
			emissionType: "Enable",
			positions: ["Right Arm", "Left Arm"],
			attach: "PalmAttachment",
		},
	},
	"Star-Trail": {
		particleReference: {
			reference: ReplicatedStorage.Assets.VFX.Combat.Trails.FindFirstChild<Attachment>("Star")!,
			emissionType: "Enable",
			attach: "PalmAttachment",
			size: 0.45,
		},
	},
	"Guard-Break": {
		particleReference: {
			reference: ReplicatedStorage.Assets.VFX.Combat.GuardBreak.FindFirstChild<Attachment>("Main")!,
			emissionType: "Emit",
			attach: "RootAttachment",
			position: "HumanoidRootPart",
			isForged: true,
			emissions: 1,
		},
	},
	"Critical-Hit": {
		particleReference: {
			reference: ReplicatedStorage.Assets.VFX.Combat.Critical.FindFirstChild<Attachment>("Main")!,
			emissionType: "Emit",
			attach: "RootAttachment",
			position: "HumanoidRootPart",
			emissions: 1,
			isForged: true,
			scaleWithHeight: true,
		},
		keyframes: [{ at: 0, effect: "Black-Trail" }],
	},
	"Light-Hit": {
		particleReference: {
			reference: ReplicatedStorage.Assets.VFX.Combat.LightHit.FindFirstChild<Attachment>("Main")!,
			emissionType: "Emit",
			attach: "RootAttachment",
			position: "HumanoidRootPart",
			size: 0.75,
			isForged: true,
			emissions: 1,
			scaleWithHeight: true,
		},
	},
	Clash: {
		particleReference: {
			reference: ReplicatedStorage.Assets.VFX.Combat.Clash.FindFirstChild<Attachment>("Main")!,
			emissionType: "Emit",
			position: "Custom",
			scaleWithHeight: true,
			isForged: true,
			parentToEffectFolder: true,
		},
	},
	Dash: {
		particleReference: {
			reference: ReplicatedStorage.Assets.VFX.Movement.Dash.FindFirstChild<Attachment>("Main")!,
			emissionType: "Emit",
			emissions: 1,
			offset: new Vector3(0, 0.5, 0),
			position: "Floor",
			scaleWithHeight: true,
			isForged: true,
			parentToEffectFolder: true,
		},
	},
};

export const EffectTimeout = 0.05;

export const EffectHighlightColors = <const>{
	Windup: Color3.fromRGB(242, 219, 0),
	Stun: Color3.fromRGB(242, 0, 0),
	Attacking: Color3.fromRGB(5, 0, 242),
	Iframe: Color3.fromRGB(255, 255, 255),
};

export const EffectHighlightTransparency = <const>{
	Windup: 0.5,
	Stun: 0.5,
	Attacking: 0.5,
	Iframe: 0.5,
};

export const EffectHighlightTransitionTime = <const>{
	Windup: 0.1,
	Stun: 0.1,
	Attacking: 0.1,
	Iframe: 0.1,
};
