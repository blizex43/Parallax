import type { StyleTableEnum } from "shared/enums/style-enum";
export type Styles = (typeof StyleTableEnum)[number];
export type StyleScaleAttribute = "damage" | "stun" | "speed" | "range";
