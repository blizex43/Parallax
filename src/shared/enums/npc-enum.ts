import psuedo from "shared/enums/default-psuedos-enum";
export const NPCEntitys = <const>["dummy", "normal"];
export const AIDummyBehaviors = <const>["attack", "idle", "block"];
export const AILevels = <const>["easy", "normal", "hard", "supreme"];
export const AIBehaviors = <const>["passive", "aggressive", "bodyguard"];
export const NPCPresets = <const>["blocking-dummy", "light-attacker", "heavy-attacker", "low-intelligence"];
export const NPCAliasTable = psuedo.map((stat) => stat.Alias);
