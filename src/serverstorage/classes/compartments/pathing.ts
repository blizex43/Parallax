import { PathAgent, type PathAgentConfig } from "@rbxts/navigate";

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

export const DefaultPathingOptions: PathingOptions = {
	agentParams: {
		AgentRadius: 2,
		AgentHeight: 5,
		AgentCanJump: true,
		AgentCanClimb: true,
		WaypointSpacing: 5,
	},
	recomputeOnBlock: true,
	timeoutEnabled: true,
	timeoutMultiplier: 2,
	waypointReachedThreshold: 2,
	visualize: false,
	targetRepathDistance: 8,
	minimumRepathInterval: 0.75,
};

export class PathingCompartment {
	private agent?: PathAgent;
	private lastTarget?: BasePart;
	private lastTargetPosition = Vector3.zero;
	private lastRepathAt = 0;
	private walkSpeed?: number;
	private options: PathingOptions;

	public constructor(
		private readonly model: CharacterModel,
		options: PathingOverrides = {},
	) {
		this.options = {
			...DefaultPathingOptions,
			...options,
			agentParams: { ...DefaultPathingOptions.agentParams, ...options.agentParams },
		};
	}

	public configure(options: PathingOverrides): void {
		this.options = {
			...this.options,
			...options,
			agentParams: { ...this.options.agentParams, ...options.agentParams },
		};
		this.agent?.destroy();
		this.agent = undefined;
		this.lastTarget = undefined;
		this.walkSpeed = undefined;
	}

	public pursue(target: BasePart, walkSpeed: number): void {
		const agent = this.getAgent(walkSpeed);
		const now = os.clock();
		const targetMoved = target.Position.sub(this.lastTargetPosition).Magnitude >= this.options.targetRepathDistance;
		const targetChanged = target !== this.lastTarget;
		const shouldRepath =
			targetChanged || (targetMoved && now - this.lastRepathAt >= this.options.minimumRepathInterval);

		if (!shouldRepath) return;
		agent.run(target);
		this.lastTarget = target;
		this.lastTargetPosition = target.Position;
		this.lastRepathAt = now;
	}

	public stop(): void {
		if (!this.lastTarget) return;
		this.agent?.stop();
		this.lastTarget = undefined;
	}

	public destroy(): void {
		this.agent?.destroy();
		this.agent = undefined;
		this.lastTarget = undefined;
	}

	private getAgent(walkSpeed: number): PathAgent {
		const agent = this.agent;
		if (agent && walkSpeed === this.walkSpeed) return agent;
		agent?.destroy();
		this.lastTarget = undefined;
		this.walkSpeed = walkSpeed;
		const nextAgent = new PathAgent(this.model, this.toAgentConfig(walkSpeed));
		this.agent = nextAgent;
		return nextAgent;
	}

	private toAgentConfig(speed: number): PathAgentConfig {
		return {
			agentParams: this.options.agentParams,
			recomputeOnBlock: this.options.recomputeOnBlock,
			timeoutEnabled: this.options.timeoutEnabled,
			speed,
			timeoutMultiplier: this.options.timeoutMultiplier,
			waypointReachedThreshold: this.options.waypointReachedThreshold,
			visualize: this.options.visualize,
		};
	}
}
