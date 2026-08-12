import { Service } from "@flamework/core";
import { Janitor } from "@rbxts/janitor";
import { $nameof } from "rbxts-transform-debug";
import { Hitbox } from "serverstorage/components/hitbox";
import type { TrackComponent } from "shared/components/track";
import type { OnMoveClassInvoked } from "serverstorage/hooks";
import type { AttackContext, AttackDefinition, HitWindow, LightData } from "shared/structs/attack";
import { AttackCatalog } from "shared/enums/catalog-enum";
import type { AnimationTrackNames } from "shared/structs/animation";
import { AttackExtendable } from "serverstorage/classes/attack-extendable";
import { TrackEventSignalParameters } from "shared/structs/trackvents";
import { Players } from "@rbxts/services";
@Service()
export class Light extends AttackExtendable implements OnMoveClassInvoked {
	public readonly nameof = <"Light">$nameof<Light>();
	public readonly lib: AttackDefinition = AttackCatalog[this.nameof];
	private readonly dataMap = new Map<CharacterModel, LightData>();
	public cancellable = undefined;
	private readonly config = <const>{
		maxIndex: 4,
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
		this.runEffects(context, track);
		this.windup(context, windupTime);
		task.delay(windupTime * 0.95, () => this.active(context, true));
		for (let win = 0; win < this.lib.windows.size(); win++) {
			const window = this.winManipulate(this.lib.windows[win], dataMap);
			const hitbox = this.createAndScale(context, track, window);
			if (!hitbox) return this.active(context, false);
			await this.sequence(track, hitbox, context, window).catch(() => this.active(context, false));
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
		hitbox: Hitbox,
		context: AttackContext,
		window: HitWindow,
	): Promise<unknown> {
		const dataMap = this.getOrCreateDataMap(context.character);
		const animName = <AnimationTrackNames>this.getAnimationName(context);
		const endSignal = this.services.trackEvents.manualSignTrack(context.character, animName, "SlowEnd");
		if (!endSignal) return Promise.resolve(<TrackEventSignalParameters>{});
		const endPromise = Promise.fromEvent(endSignal.signal);
		const exitCallback = (): void => {
			this.active(context, false);
			// this.runEffects(context, track, 2);
			hitbox.onDestroy();
		};
		hitbox.link((character) => this.success(this.defaultCreateHitData(context, window, character)));
		endPromise
			.then(() => {
				hitbox.start();
				this.cycleIndex(dataMap);
				this.refreshPromise(dataMap, context);
				// this.runEffects(context, track, 2);
				this.drain(context, window);
			})
			.catch(() => {
				exitCallback();
			});
		const cancelPromise = new Promise((resolve) => {
			const connection = this.cancelledSignal.Connect((sigText) => {
				if (sigText.character === context.character) {
					connection.Disconnect();
					exitCallback();
					resolve("cancelled");
				}
			});
			endPromise.finally(() => connection.Disconnect());
		});
		this.cancelPromise(dataMap);
		this.post(context, window, hitbox);
		track.play();

		return Promise.race([endPromise.timeout(2), cancelPromise]);
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
