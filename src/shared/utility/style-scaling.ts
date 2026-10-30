import { StyleCatalog } from "shared/enums/style-catalog-enum";
import type { AttackLiterals } from "shared/structs/attack";
import type { StyleScaleAttribute, Styles } from "shared/structs/styles";

export function getStyleAttributeScale(
	style: Styles,
	attribute: StyleScaleAttribute,
	attack: AttackLiterals,
	defaultValue = 1,
): number {
	const scale = StyleCatalog[style][attribute];
	return scale.included.includes(attack) ? scale.potency : defaultValue;
}

export function getStyleAttributeOffset(
	style: Styles,
	attribute: StyleScaleAttribute,
	attack: AttackLiterals,
	defaultValue = 1,
): number {
	const scale = StyleCatalog[style][attribute];
	return scale.included.includes(attack) && scale.offset ? scale.offset : defaultValue;
}
