export type AtomType = CooldownAtom | boolean | number | DependerAtom;
export type CooldownAtom = Record<string, CooldownEntry>;
export type DependerAtom = Record<string, DependerEntry>;
export interface CooldownEntry {
	start: number;
	end: number;
	halted: boolean;
}

export interface DependerEntry {
	name: string;
	start: number; // when it was added
	end?: number; // optional expiration
}
