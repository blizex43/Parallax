import { defaultSettings } from "./Settings";
import { Hitbox } from "./Types";

interface ShapecastHitbox {
	new (instance?: Instance, raycastParams?: RaycastParams): Hitbox;
	Settings: typeof defaultSettings;
	CastTypes: {
		Raycast: "Raycast";
		Blockcast: "Blockcast";
		Spherecast: "Spherecast";
	};
}

declare const ShapecastHitbox: ShapecastHitbox;

export = ShapecastHitbox;
