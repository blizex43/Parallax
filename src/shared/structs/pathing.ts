import type { PathAgentConfig } from "@rbxts/navigate";

export interface PathingOptions {
	agentParams: NonNullable<PathAgentConfig["agentParams"]>;
	recomputeOnBlock: boolean;
	timeoutEnabled: boolean;
	timeoutMultiplier: number;
	waypointReachedThreshold: number;
	visualize: boolean;
	targetRepathDistance: number;
	minimumRepathInterval: number;
}

export type PathingOverrides = Partial<Omit<PathingOptions, "agentParams">> & {
	agentParams?: Partial<PathingOptions["agentParams"]>;
};
