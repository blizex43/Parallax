import { Service } from "@flamework/core";
import { Janitor } from "@rbxts/janitor";
import { $nameof } from "rbxts-transform-debug";
import type { Hitbox } from "serverstorage/components/hitbox";
import type { TrackComponent } from "shared/components/track";
import type { OnMoveClassInvoked } from "serverstorage/hooks";
import type { AttackContext, AttackDefinition, HitWindow, LightData } from "shared/structs/attack";
import { AttackCatalog } from "shared/enums/catalog-enum";
import type { AnimationTrackNames } from "shared/structs/animation";
import { AttackExtendable } from "serverstorage/classes/attack-extendable";
import { Players } from "@rbxts/services";
@Service()
export class Light extends AttackExtendable implements OnMoveClassInvoked {
	public readonly nameof = <"Light">$nameof<Light>();
	public readonly lib: AttackDefinition = AttackCatalog[this.nameof];
	private readonly dataMap = new Map<CharacterModel, LightData>();
	public cancellable = undefined;
	private readonly config = <const>{
		maxIndex: 5,
		endCooldown: 1.3,
		finalDebounce: 0.7,
	};

	public async invoked(context: AttackContext): Promise<void> {
		const { character } = context;
		if (!this.canAttack(character)) return;
		const dataMap = this.getOrCreateDataMap(context.character);
		const track = this.services.animation.getTrack(character, <"walk">this.getAnimationName(context));
		if (!track || track.playing()) return;
		const windupTime = this.getWindupTime(context);
		const maxIndex = dataMap.index === dataMap.maxIndex;
		print(dataMap.index, maxIndex);
		this.runEffects(context, track);
		this.windup(context, windupTime);
		const clientOwned = Players.GetPlayerFromCharacter(character) !== undefined;
		for (let win = 0; win < this.lib.windows.size(); win++) {
			const window = this.winManipulate(this.lib.windows[win], dataMap);
			const hitbox = clientOwned ? undefined : this.createAndScale(context, track, window);
			if (!clientOwned && !hitbox) return this.active(context, false);
			if (clientOwned) this.scaleTrack(context, track);
			await this.sequence(track, hitbox, context, window, maxIndex).catch(() => this.active(context, false));
		}
		return await this.onFinished(context, this.getCooldown(context), maxIndex);
	}

	public getAnimationName(context: AttackContext): AnimationTrackNames {
		const { character, data } = context;
		const dataMap = this.getOrCreateDataMap(character);
		const index = dataMap.index ?? 1;
		return <AnimationTrackNames>`${data.style}:${data.stance}:light${index}`.lower();
	}

	public async onFinished(context: AttackContext, cooldown: number, maxIndex: boolean): Promise<void> {
		this.cooldown(context, maxIndex ? this.config.finalDebounce : cooldown);
		this.recovery(context, this.getRecoveryTime(context));
		this.active(context, false);
	}

	public async sequence(
		track: TrackComponent,
		hitbox: Maybe<Hitbox>,
		context: AttackContext,
		window: HitWindow,
		maxIndex: boolean,
	): Promise<void> {
		const dataMap = this.getOrCreateDataMap(context.character);
		this.cancelPromise(dataMap);
		await this.defaultSequence(
			track,
			hitbox,
			context,
			window,
			maxIndex ? this.config.endCooldown : this.getCooldown(context),
		);
		this.cycleIndex(dataMap);
		this.refreshPromise(dataMap, context);
	}

	public winManipulate(window: HitWindow, dataMap: LightData): HitWindow {
		if (dataMap.index === dataMap.maxIndex) return this.lib.special![0];
		return window;
	}

	private refreshPromise(dataMap: LightData, context: AttackContext): Promise<void> {
		return (dataMap.promise = new Promise((resolve) => {
			task.wait(this.config.endCooldown / math.min(1, context.scaling.attack.speed));
			resolve(void (dataMap.index = 1));
		}));
	}

	private cancelPromise(dataMap: LightData): void {
		if (dataMap.promise && dataMap.promise.getStatus() === "Started") dataMap.promise.cancel();
	}

	private getOrCreateDataMap(character: CharacterModel): LightData {
		let data = this.dataMap.get(character);
		if (!data) {
			data = {
				index: 1,
				clock: os.clock(),
				maxIndex: this.config.maxIndex,
				janitor: new Janitor(),
				promise: undefined,
			};
			this.dataMap.set(character, data);
		}
		return data;
	}

	private runEffects(context: AttackContext, track: TrackComponent, sequence: number = 1): void {
		const { character } = context;
		const limb = this.getLimb(track);
		if (!limb) return;
		switch (sequence) {
			case 1:
				this.effect({
					name: "Basic-Trail",
					options: {
						duration: this.getAttackFullTime(context) - this.getRecoveryTime(context),
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
				// 		delay: this.getWindupTime(context) / 3,
				// 		character,
				// 		players: Players.GetPlayers(),
				// 		radius: 110,
				// 		more: {
				// 			limb: [limb],
				// 		},
				// 	},
				// });

				break;
			// case 2:
			// 	this.effect({
			// 		name: "Star-Trail",
			// 		options: {
			// 			character,
			// 			players: Players.GetPlayers(),
			// 			delay: 0.6 / context.scaling.attack.speed,
			// 			radius: 110,
			// 			deactivate: true,
			// 		},
			// 	});
			// 	break;
		}
	}

	private cycleIndex(data: LightData): void {
		data.index = data.index >= data.maxIndex ? 1 : data.index + 1;
	}
}
