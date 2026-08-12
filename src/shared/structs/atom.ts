export type AtomType = CooldownAtom | boolean | number | DependerAtom;
export type CooldownAtom = Map<string, CooldownEntry>;
export type DependerAtom = Map<string, DependerEntry>;
export interface CooldownEntry {
	start: number;
	end: number;
	halted: boolean;
}

export interface DependerEntry {
	start: number; // when it was added
	end?: number; // optional expiration
}
