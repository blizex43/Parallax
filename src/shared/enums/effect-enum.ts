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
export const EffectTimeout = 0.05;

export const EffectHighlightColors = <const>{
	["Windup"]: Color3.fromRGB(242, 219, 0),
	["Stun"]: Color3.fromRGB(242, 0, 0),
	["Attacking"]: Color3.fromRGB(5, 0, 242),
	["Iframe"]: Color3.fromRGB(255, 255, 255),
};
export const EffectHighlightTransparency = <const>{
	["Windup"]: 0.5,
	["Stun"]: 0.5,
	["Attacking"]: 0.5,
	["Iframe"]: 0.5,
};

export const EffectHighlightTransitionTime = <const>{
	["Windup"]: 0.1,
	["Stun"]: 0.1,
	["Attacking"]: 0.1,
	["Iframe"]: 0.1,
};
