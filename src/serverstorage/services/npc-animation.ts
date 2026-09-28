import { OnTick, Service } from "@flamework/core";
import type { OnNPCDestroyed, OnNPCMade } from "serverstorage/hooks";
import type { NPCType } from "shared/structs/npc";
import type { AnimationService } from "./animation";
import { HumanoidBaseWalkspeed, HumanoidMoveThreshhold } from "shared/enums/humanoid-enum";
import type { WebsocketService } from "./websocket";
import type { AnimationTrackNames } from "shared/structs/animation";
import { CombatState } from "shared/enums/config-enum";

// @Service()
export class NpcAnimationService implements OnNPCMade, OnNPCDestroyed, OnTick {
	private readonly cache: Set<NPCType> = new Set();
	constructor(
		private readonly anim: AnimationService,
		private readonly ws: WebsocketService,
	) { }
	public onTick(dt: number): void {
		for (const npc of this.cache) this.updateAnimationAsync(npc);
	}

	public async updateAnimationAsync(npc: NPCType): Promise<void> {
		const humanoid = npc.model.FindFirstChild("Humanoid");
		const anims = this.getAnimationNames(npc);
		if (!humanoid || !anims) return;
		const { idle, walk } = anims;
		const moving = this.isMoving(humanoid);
		const speedMul = this.getSpeedMultiplier(humanoid);
		if (moving && !this.anim.isPlaying(npc.model, walk))
			this.anim.playAnim(npc.model, walk, true, { speed: speedMul });
		else if (!moving && !this.anim.isPlaying(npc.model, idle)) this.anim.playAnim(npc.model, idle);
		this.adjustSpeed(npc.model, speedMul);
	}

	private isMoving(humanoid: Humanoid): boolean {
		return humanoid.MoveDirection.Magnitude > HumanoidMoveThreshhold;
	}

	private adjustSpeed(character: CharacterModel, speed: number) {
		this.anim.adjustSpeed(character, "walk", speed);
	}

	private getSpeedMultiplier(humanoid: Humanoid): number {
		return humanoid.WalkSpeed / HumanoidBaseWalkspeed;
	}

	private getAnimationNames(npc: NPCType): Maybe<{ idle: AnimationTrackNames; walk: AnimationTrackNames }> {
		const wsu = this.ws.getWebsocketUtilities(npc.model);
		if (!wsu) return;
		const combatEquipped = wsu.get(CombatState.CombatEquip);
		return {
			idle: <AnimationTrackNames>(
				(combatEquipped.status
					? `${npc.component.data.style}:${npc.component.data.stance}:"idle`.lower()
					: "idle")
			),
			walk: <AnimationTrackNames>(
				(combatEquipped.status
					? `${npc.component.data.style}:${npc.component.data.stance}:"walk`.lower()
					: "walk")
			),
		};
	}

	public onNPCMade(npc: NPCType): void {
		this.cache.add(npc);
	}

	public onNPCDestroyed(npc: NPCType): void {
		this.cache.delete(npc);
	}
}
