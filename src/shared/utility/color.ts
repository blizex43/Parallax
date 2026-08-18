import { isColor3, isString } from "./t-isA";

export function tocolor3(value: unknown): Maybe<Color3> {
	if (!isString(value)) return;
	const match = value.match("^Color3%((%-?%d+%.?%d*),%s*(%-?%d+%.?%d*),%s*(%-?%d+%.?%d*)%)");
	if (!match) return;
	const [r, g, b] = (<string[]>match).map((n) => tonumber(n));

	if (r && g && b) {
		return new Color3(r, g, b);
	}
	return;
}

export function color3tostring(value: unknown): Maybe<string> {
	return isColor3(value) ? `Color3(${value.R}, ${value.G}, ${value.B})` : undefined;
}
