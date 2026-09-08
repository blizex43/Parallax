import type { StyleContext } from "shared/structs/attack";
import type { Styles } from "shared/structs/styles";

export const StyleCatalog: Record<Styles, StyleContext> = <const>{
	Base: {
		damage: {
			potency: 0.9,
			included: ["Light", "Heavy"],
		},
		speed: {
			potency: 0.85,
			included: ["Light", "Heavy"],
			offset: 0.7,
		},
		range: {
			potency: 0.8,
			included: ["Light", "Heavy"],
		},
		stun: {
			potency: 0.9,
			included: ["Light", "Heavy"],
		},
	},

	Karate: {
		damage: {
			potency: 1.07,
			included: ["Light", "Heavy"],
		},
		speed: {
			potency: 0.9,
			included: ["Light", "Heavy"],
		},
		range: {
			potency: 1.1,
			included: ["Light", "Heavy"],
		},
		stun: {
			potency: 1,
			included: ["Light", "Heavy"],
		},
	},

	"Muay Thai": {
		damage: {
			potency: 1.11,
			included: ["Light", "Heavy"],
		},
		speed: {
			potency: 1,
			included: ["Light", "Heavy"],
		},
		range: {
			potency: 1,
			included: ["Light", "Heavy"],
		},
		stun: {
			potency: 1,
			included: ["Light", "Heavy"],
		},
	},
	Boxing: {
		damage: {
			potency: 1.11,
			included: ["Light", "Heavy"],
		},
		speed: {
			potency: 1.3,
			included: ["Light", "Heavy"],
		},
		range: {
			potency: 1,
			included: ["Light", "Heavy"],
		},
		stun: {
			potency: 1,
			included: ["Light", "Heavy"],
		},
	},
};
