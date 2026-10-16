import type psuedo from "shared/enums/default-psuedos-enum";
export type PsuedoDefaultData = (typeof psuedo)[number];
export type Alias = (typeof psuedo)[number]["Alias"];
