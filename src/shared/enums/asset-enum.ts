export type AssetTypes = (typeof assetTypes)[number];
export const assetTypes = [
	"Animation",
	"Mesh",
	"SpecialMesh",
	"Sound",
	"ImageButton",
	"Texture",
	"Decal",
	"ImageLabel",
	"MeshPart",
] as const;
