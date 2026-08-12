export enum CollisionGroups {
	Characters = "Characters",
	Hurtboxes = "Hurtboxes",
}
export const NonCollisionConfiguration: Partial<Record<CollisionGroups, CollisionGroups[]>> = {
	Characters: [CollisionGroups.Characters],
	Hurtboxes: [CollisionGroups.Hurtboxes, CollisionGroups.Characters],
};

export const CollisionConfiguration: Partial<Record<CollisionGroups, CollisionGroups[]>> = {};
