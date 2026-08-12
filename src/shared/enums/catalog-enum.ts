import type { AttackDefinition, AttackLiterals } from "shared/structs/attack";

export const AttackCatalog: Record<AttackLiterals, AttackDefinition> = <const>{
	Light: {
		id: "Light",
		tags: ["Melee"],
		cooldown: 0.25,
		speed: 1,
		phases: {
			windup: 0.1,
			recovery: 0.1,
		},
		hitPolicy: {
			hitOnce: true,
		},
		windows: [
			{
				linger: 0.35,
				stamina: 0.1, // 3
				maxLinger: 0.5,
				query: {
					kind: "Shapecast",
					shape: { kind: "Box", size: new Vector3(1, 1, 1.2) },
					offset: new CFrame(0, 0, -3),
					direction: new Vector3(0, 0, -1),
					distance: 5,
				},
				onHit: {
					damage: 3,
					stun: {
						duration: 1,
						type: "Normal",
					},
					clash: {
						priority: 1,
					},
					hitEffects: ["Light-Hit"],
					knockback: {
						power: 10,
						direction: new Vector3(0, 0, -1),
						duration: 0.1,
						type: "Normal",
					},
				},
			},
		],
		special: [
			{
				linger: 0.35,
				maxLinger: 0.55,
				stamina: 3,
				query: {
					kind: "Shapecast",
					shape: { kind: "Box", size: new Vector3(1, 1, 1.2) },
					offset: new CFrame(0, 0, -3),
					direction: new Vector3(0, 0, -1),
					distance: 5,
				},
				onHit: {
					damage: 3,
					stun: {
						duration: 1,
						type: "Normal",
					},
					clash: {
						priority: 1,
					},
					hitEffects: ["Light-Hit"],
					knockback: {
						power: 35,
						direction: new Vector3(0, 0, -1),
						duration: 0.52,
						type: "Super",
					},
					ailments: [
						{
							ailment: "Iframe",
							duration: 0.55,
						},
					],
				},
			},
		],
	},
	Heavy: {
		id: "Heavy",
		tags: ["Melee"],
		cooldown: 2.5,
		speed: 0.6,
		phases: {
			windup: 0.2,
			recovery: 0.25,
		},
		hitPolicy: {
			hitOnce: true,
		},
		windows: [
			{
				linger: 0.45,
				maxLinger: 0.6,
				stamina: 4,
				query: {
					kind: "Shapecast",
					shape: { kind: "Box", size: new Vector3(1.1, 1.1, 1.2) },
					offset: new CFrame(0, 0, -2.5),
					direction: new Vector3(0, 0, -1),
					distance: 6,
				},
				onHit: {
					damage: 5,
					clash: {
						priority: 2,
					},
					stun: {
						duration: 1,
						type: "Normal",
					},
					hitEffects: ["Light-Hit"],
					knockback: {
						direction: new Vector3(0, 0, -1),
						power: 40,
						duration: 0.52,
						type: "Super",
					},
					breaker: {
						duration: 1.4,
					},
				},
			},
		],
	},
};
