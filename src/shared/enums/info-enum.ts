import { t } from "@rbxts/t";

export const RollTypes = <const>["Clan", "Height", "Trait", "EyeColor", "HairColor", "Eyes", "Nose", "Mouth"];
export const Clans = <const>{
	Common: {
		weight: 95,
		type: "Normal",
		value: [
			"Takeuchi",
			"Kuichi",
			"Imai",
			"Hanafusa",
			"Dudley",
			"Seishu",
			"Muteba",
			"Nikaido",
			"Okubo",
			"Yamashita",
			"Meguro",
			"Kono",
			"Tyson",
			"Harada",
			"Akiyama",
			"Kushida",
			"Saw",
			"Wongsawat",
			"Hatsumi",
			"None",
		],
	},
	Rare: {
		weight: 4,
		type: "Normal",

		value: ["Gaoh", "Gensai", "Hanayama", "Kuroki", "Takeshi", "Kiryu"],
	},
	Legendary: {
		weight: 1,
		type: "Normal",
		value: ["Kure", "Mikazuchi", "Reinhold", "Tokita"],
	},
	Mythic: {
		weight: 0.5,
		type: "Normal",
		value: ["Hanma", "Pickle", "Wu"],
	},
};

export const Traits = <const>{
	Common: {
		weight: 67,
		type: "Normal",
		value: ["Focused", "Attentive", "Aggressive", "Resillient"],
	},
	Rare: {
		weight: 30,
		type: "Normal",
		value: ["Masochist", "Violent", "Alert", "Persistent", "Defiant"],
	},
	Legendary: {
		weight: 3,
		type: "Normal",
		value: ["Determined", "Firm", "Impatient", "Quick Witted"],
	},
};
export const Noses = <const>{
	Common: {
		weight: 20,
		type: "Normal",
		value: [0, 1, 2],
	},
};
export const Mouths = <const>{
	Common: {
		weight: 20,
		type: "Normal",
		value: [0, 1, 2],
	},
};
export const Eyes = <const>{
	Common: {
		weight: 20,
		type: "Normal",
		value: [0, 1, 2],
	},
};
export const HairColors = <const>{
	Brown: {
		weight: 20,
		type: "Normal",
		value: Color3.fromRGB(72, 49, 39),
	},
	Blonde: {
		weight: 20,
		type: "Normal",
		value: Color3.fromRGB(194, 189, 133),
	},
	Orange: {
		weight: 15,
		type: "Normal",
		value: Color3.fromRGB(159, 67, 5),
	},
	Black: {
		weight: 20,
		type: "Normal",
		value: Color3.fromRGB(10, 10, 10),
	},
	Random: {
		weight: 10,
		type: "Normal",
		value: "Randomized",
	},
};

export const EyeColors = <const>{
	Brown: {
		weight: 30,
		type: "Normal",
		value: Color3.fromRGB(100, 80, 70),
	},
	Green: {
		weight: 20,
		value: Color3.fromRGB(2, 100, 60),
	},
	Blue: {
		weight: 20,
		type: "Normal",
		value: Color3.fromRGB(72, 120, 163),
	},
	Black: {
		weight: 20,
		type: "Normal",
		value: Color3.fromRGB(75, 75, 75),
	},
	Random: {
		weight: 10,
		type: "Normal",
		value: "Randomized",
	},
};

export const Authorities = <const>["Adaptation", "Little King"];
export const Heights = <const>{
	Common: {
		weight: 88,
		type: "Random",
		value: [0.98, 1.04],
	},
	Rare: {
		weight: 10,
		type: "Random",
		value: [1.06, 1.15],
	},
	Legendary: {
		weight: 2,
		type: "Random",
		value: [1.17, 1.3],
	},
};

export const Descriptions = <const>{
	Trait: {
		Focused: "Do 10% extra more damage if your focus is fully charged",
		Attentive: "You gain 5% more focus when hitting someone with M1s",
		Resillient: "Your health regens 50% faster",
		Aggressive: "You deal 10% more damage when at 0 focus",
		Fist_Eye: "Kinetic Vision that allows the user to read the flow of combat",

		Masochist: "You gain 5% more focus when getting hit by any sort of attack",
		Violent: "You do 50% more damage per attack when executing someone",
		Alert: "Landing a Dash-Dodge will remove 1 second from your dash cooldown",
		Persistent: "Landing a Dodge will extend the frames further with the full dodge frames as normal",
		Defiant: "Your knocked times are 25% smaller when done by a player",

		Determined:
			"Your determination won't let you down. Withstand a killing blow and regen 20% of health in a last ditch effort",
		Firm: "Your recovery health goes down 25% slower and your health regens 50% faster",
		Impatient: "When landing an M2 attack, reduce all skill cooldowns by 1 second",
		Quick_Witted: "Landing a dash dodge will reset your dash cooldown to 0",
	},
};
