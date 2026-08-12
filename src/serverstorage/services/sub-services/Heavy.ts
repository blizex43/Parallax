import { Service } from "@flamework/core";
import { $nameof } from "rbxts-transform-debug";
import type { OnMoveClassInvoked } from "serverstorage/hooks";
import type { AttackContext, AttackDefinition } from "shared/structs/attack";
import { AttackCatalog } from "shared/enums/catalog-enum";
import { AttackExtendable } from "serverstorage/classes/attack-extendable";
import { AnimationTrackNames } from "shared/structs/animation";
import { Players } from "@rbxts/services";
import { TrackComponent } from "shared/components/track";

@Service()
export class Heavy extends AttackExtendable implements OnMoveClassInvoked {
	public readonly nameof = <"Heavy">$nameof<Heavy>();
	public readonly lib: AttackDefinition = AttackCatalog[this.nameof];
	public cancellable = undefined;

	public async invoked(context: AttackContext): Promise<void> {
		const { character } = context;
		if (!this.canAttack(character)) return;
		const track = this.services.animation.getTrack(character, <"walk">this.getAnimationName(context));
		if (!track || track.playing()) return;
		this.runEffects(context, track);
		const response = await this.enterDefaultAttackSequence(context, track);
		if (!response) return;
		return await this.defaultOnFinished(context, this.getCooldown(context));
	}

	private runEffects(context: AttackContext, track: TrackComponent): void {
		const { character } = context;
		const limb = this.getLimb(track);
		if (!limb) return;
		this.effect({
			name: "Basic-Trail",
			options: {
				duration: this.getAttackFullTime(context),
				character,
				players: Players.GetPlayers(),
				radius: 110,
				more: {
					limb: [limb],
				},
			},
		});
		// this.effect({
		// 	name: "Star-Trail",
		// 	options: {
		// 		duration: this.getScaledCumulativeWindowTime(context) - this.getWindupTime(context) / 3,
		// 		character,
		// 		players: Players.GetPlayers(),
		// 		delay: this.getWindupTime(context) / 3,
		// 		radius: 110,
		// 		more: {
		// 			limb: [limb],
		// 		},
		// 	},
		// });

		this.effect({
			name: "Critical-Hit",
			options: {
				character,
				players: Players.GetPlayers(),
				radius: 110,
				duration: this.getAttackFullTime(context),
			},
		});
	}

	public getAnimationName(context: AttackContext): AnimationTrackNames {
		const { data } = context;
		return <AnimationTrackNames>`${data.style}:${data.stance}:heavy`.lower();
	}
}
