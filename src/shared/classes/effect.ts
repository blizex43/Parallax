import { Dependency } from "@flamework/core";
import { Janitor } from "@rbxts/janitor";
import { BaseEffect } from "@rbxts/refx";
import { Workspace as World } from "@rbxts/services";

import type { AnimationController } from "client/controllers/animation";
import type { AudioController } from "client/controllers/audio";
import type { JournalController } from "client/controllers/journal";
import type { VFXController } from "client/controllers/effects";
import type {
	EffectContext,
	EffectName,
	EffectPositionType,
	EffectReferenceType,
	PacketSafeEffectOptions,
	StandardEffect,
} from "shared/structs/effect";

import { emitDescendants, enableDescendants } from "shared/utility/particles";
import { getRaycastLine } from "shared/utility/raycast";

import {
	isAttachment,
	isBasePart,
	isCFrame,
	isModel,
	isParticleEmitter,
	isSound,
	isVector3,
} from "shared/utility/t-isA";
import { getCharacterLimbs, getChildAttachments, getHeightFromHumanoid } from "shared/utility/basepart";

import Log from "shared/log";
import { multiplyNumberSequence } from "shared/utility/complex";
import { Create } from "shared/utility/instance";
import { emit } from "@zilibobi/forge-vfx"
import LazyIterator from "@rbxts/lazy-iterator";
import { atom } from "@rbxts/charm";

export abstract class BasePartEffect extends BaseEffect implements StandardEffect {
	public readonly IsDestroyedAtom: Charm.Atom<boolean> = atom(false);
	public onRemote?(options: PacketSafeEffectOptions): void;
	protected abstract readonly name: EffectName;
	protected abstract readonly emitCount: number;
	protected abstract readonly reference: EffectContext;
	protected abstract readonly options: PacketSafeEffectOptions;
	protected readonly effectParent = World.Effects.FX;
	protected readonly janitor = new Janitor();
	protected readonly effectsCache: LazyIterator<EffectReferenceType> = LazyIterator.fromArray([]);
	protected abstract OnStart(): void;

	protected readonly services = {
		animation: Dependency<AnimationController>(),
		journal: Dependency<JournalController>(),
		sound: Dependency<AudioController>(),
		effect: Dependency<VFXController>(),
	};

	public constructor() {
		super();
		this.hookSignals();
	}

	/* --------------------------------- */
	/*             EFFECTS               */
	/* --------------------------------- */

	protected makeEffectMultiple(
		character: CharacterModel,
		variantCallback?: () => string,
		options?: PacketSafeEffectOptions,
	): EffectReferenceType[] {
		const positions = this.reference.particleReference.positions;
		if (!positions && !options?.more?.limb) return [];

		const effects = <EffectReferenceType[]>[];
		if (options?.more?.limb)
			for (const position of options.more.limb) {
				const effect = this.makeEffectFromPosition(character, position, variantCallback);
				if (effect) effects.push(effect);
			}
		if (positions)
			for (const position of positions) {
				const effect = this.makeEffectFromPosition(character, position, variantCallback);
				if (effect) effects.push(effect);
			}
		this.effectsCache.append(...effects);
		return effects;
	}

	protected makeEffect<T extends EffectReferenceType = EffectReferenceType>(
		character: CharacterModel,
		variantCallback?: () => string,
		transformCallback?: (effect: T) => T,
		options?: PacketSafeEffectOptions,
	): Maybe<T> {
		const effect = this.makeEffectFromPosition<T>(
			character,
			this.reference.particleReference.position,
			variantCallback,
			options,
		);
		if (!effect) return;
		this.effectsCache.append(effect);
		return transformCallback ? transformCallback(effect) : effect;
	}

	private makeEffectFromPosition<T extends EffectReferenceType = EffectReferenceType>(
		character: CharacterModel,
		position: Maybe<EffectPositionType>,
		variantCallback?: () => string,
		options?: PacketSafeEffectOptions,
	): Maybe<T> {
		const clone = this.createEffectClone<T>(variantCallback);
		if (!position) return this.reconcileClone<T>(clone, undefined, options);
		if (this.reference.particleReference.attach) {
			const attachment = this.getCastAttachment(character, position);
			if (!attachment) return;

			return this.reconcileCloneByAttachment<T>(character, clone, attachment, options);
		}

		const castPosition = this.getCastPosition(character, position, options);
		if (!castPosition) return;

		return this.reconcileClone<T>(clone, castPosition, options);
	}

	/* --------------------------------- */
	/*              SOUND                */
	/* --------------------------------- */

	protected makeSound(variantCallback?: () => string): Maybe<Sound> {
		const soundReference = this.reference.soundReference;
		if (!soundReference) return;

		const soundInstance = soundReference.reference;

		if (
			isSound(soundInstance) ||
			!soundReference.variants ||
			soundReference.variants.isEmpty() ||
			!variantCallback
		) {
			return <Sound>soundInstance.Clone();
		}

		const variant = variantCallback();

		if (soundReference.variants.includes(variant)) {
			return soundInstance.FindFirstChild<Sound>(variant)?.Clone();
		}

		return soundInstance.FindFirstChild<Sound>(soundReference.variants[0])?.Clone();
	}

	protected playSound(effect: EffectReferenceType, sound: Maybe<Sound>): void {
		if (!sound) return;

		this.services.sound.playNoReplication(sound, {
			position: effect.Position,
			createContainerPart: true,
		});
	}

	/* --------------------------------- */
	/*             PLAYBACK              */
	/* --------------------------------- */

	protected playEffect(
		effect: EffectReferenceType,
		parent?: boolean,
		duration?: number,
		parentInstance: Instance = this.effectParent,
	): void {
		if (parent) effect.Parent = parentInstance;

		this.emit(effect, duration);
	}

	protected emit(instance: Instance, duration?: number): void {
		if (this.reference.particleReference.isForged) {
			const env = emit(instance);
			if (duration) task.delay(duration, () => env.Clear());
		} else
			switch (this.reference.particleReference.emissionType) {
				case "Enable":
					enableDescendants(instance, true);

					if (duration) {
						task.delay(duration, () => this.deEmit(instance));
					}

					break;

				case "All":
					emitDescendants(instance, this.emitCount);
					enableDescendants(instance, true);

					if (duration) {
						task.delay(duration, () => this.deEmit(instance));
					}

					break;

				default:
					emitDescendants(instance, this.emitCount);
					break;
			}
	}

	protected deEmit(instance: Instance): void {
		enableDescendants(instance, false);
	}

	/* --------------------------------- */
	/*             CLONING               */
	/* --------------------------------- */

	protected createEffectClone<T extends EffectReferenceType = EffectReferenceType>(
		variantCallback?: () => string,
	): T {
		const particleReference = this.reference.particleReference;

		let clone: T | undefined;

		if (particleReference.variants && variantCallback) {
			const variant = variantCallback();

			if (particleReference.variants.includes(variant)) {
				clone = particleReference.reference.FindFirstChild<T>(variant)?.Clone();
			} else {
				clone = particleReference.reference.FindFirstChild<T>(particleReference.variants[0])?.Clone();
			}
		}

		clone ??= <T>particleReference.reference.Clone();

		this.janitor.Add(clone);

		return clone;
	}

	protected reconcileClone<T extends EffectReferenceType = EffectReferenceType>(
		clone: T,
		castPosition?: Vector3,
		options?: PacketSafeEffectOptions,
	): T {
		if (castPosition) clone.Position = castPosition;
		if (isBasePart(clone)) {
			clone.Anchored = true;
			clone.CanCollide = false;
		}

		if ((options && options.more?.direction) || this.reference.particleReference.position === "Custom") {
			print(options?.more?.direction);
			let newCFrame = clone.CFrame;
			if (options && options.more?.direction)
				newCFrame = CFrame.lookAt(newCFrame.Position, newCFrame.VectorToWorldSpace(options.more.direction));
			clone.CFrame = this.addOffset(newCFrame);
		}

		if (options && options.more?.position) clone.Position = options.more.position;

		for (const child of clone.GetDescendants())
			if (isBasePart(child)) {
				child.Anchored = true;
				child.CanCollide = false;
			}
		for (const child of clone.GetChildren())
			if (isModel(child)) {
				const current = child.GetPivot();
				child.PivotTo(CFrame.fromMatrix(clone.Position, current.XVector, current.YVector, current.ZVector));
			}

		return clone;
	}

	protected reconcileCloneByAttachment<T extends EffectReferenceType = EffectReferenceType>(
		character: CharacterModel,
		clone: T,
		attachment: Attachment,
		options?: PacketSafeEffectOptions,
	): T {
		const humanoid = character.Humanoid;
		if (isBasePart(clone)) {
			clone.Anchored = false;
			clone.CanCollide = false;
		}
		if (options && options.more?.direction) {
			clone.CFrame = CFrame.lookAt(clone.Position, options.more.direction);
		}
		if (isAttachment(clone)) {
			for (const child of clone.GetDescendants())
				if (isAttachment(child)) child.CFrame = child.CFrame.sub(attachment.Position);
		}
		if (this.reference.particleReference.size) {
			for (const child of clone.GetDescendants()) {
				if (!isParticleEmitter(child)) continue;
				child.Size = multiplyNumberSequence(child.Size, this.reference.particleReference.size);
			}
		}
		if (this.reference.particleReference.scaleWithHeight) {
			const height = getHeightFromHumanoid(humanoid);
			for (const child of clone.GetDescendants()) {
				if (!isParticleEmitter(child)) continue;
				child.Size = multiplyNumberSequence(child.Size, height);
			}
		}
		this.checkWeld(character, clone);
		clone.Parent = attachment;
		return clone;
	}

	protected checkWeld(character: CharacterModel, clone: EffectReferenceType): void {
		const position = this.reference.particleReference.position;
		if (!position || position === "Floor" || position === "Custom" || !isBasePart(clone)) return;
		const limb = getCharacterLimbs(character, [position]).shift();
		if (limb && this.reference.particleReference.weld && position) {
			Create("Weld", "EffectWeld", clone, (weld) => {
				weld.Part0 = limb;
				weld.Part1 = clone;
			});
		}
	}

	/* --------------------------------- */
	/*            POSITIONING            */
	/* --------------------------------- */

	private addOffset<T extends CFrame | Vector3>(value: T): T {
		const offset = this.reference.particleReference.offset;
		if (!offset) return value;

		if (isCFrame(value)) {
			return <T>value.add(value.VectorToWorldSpace(offset));
		}

		if (isVector3(value)) {
			return <T>value.add(offset);
		}

		return value;
	}

	private getCastAttachment(character: CharacterModel, position: EffectPositionType): Maybe<Attachment> {
		try {
			if (position === "Floor" || position === "Custom") return;

			return getChildAttachments(character, this.reference.particleReference.attach!, [position]).shift();
		} catch (e) {
			Log.warn(<string>e);
			return;
		}
	}

	private getCastPosition(
		character: CharacterModel,
		position: EffectPositionType,
		options?: PacketSafeEffectOptions,
	): Maybe<Vector3> {
		if (position === "Custom" && options && options.more?.position) return options.more.position;
		try {
			if (this.reference.particleReference.subPosition && position !== "Floor") {
				const attachment = this.getCastAttachment(character, position);
				if (!attachment) return;

				return this.addOffset(attachment.WorldCFrame).Position;
			}

			let castCFrame = this.getCastCFrame(character, position);
			if (!castCFrame) return;

			castCFrame = this.addOffset(castCFrame);

			switch (position) {
				case "Floor": {
					const humanoid = character.Humanoid;
					const height = getHeightFromHumanoid(humanoid);

					const raycastPosition = getRaycastLine(
						castCFrame,
						"down",
						(this.reference.particleReference.power ?? 1) * height,
						[World.FindFirstChild("Nest") ?? character],
					);

					return raycastPosition ? this.addOffset<Vector3>(raycastPosition) : undefined;
				}

				default:
					return castCFrame.Position;
			}
		} catch (e) {
			Log.warn(<string>e);
			return;
		}
	}

	private getCastCFrame(character: CharacterModel, position: EffectPositionType): Maybe<CFrame> {
		try {
			switch (position) {
				case "HumanoidRootPart":
				case "Floor":
					return character.HumanoidRootPart.CFrame;

				default:
					return character.FindFirstChild<BasePart>(position)?.CFrame;
			}
		} catch (e) {
			Log.warn(<string>e);
			return;
		}
	}

	/* --------------------------------- */
	/*             DESTROY               */
	/* --------------------------------- */

	public getStandard(): BaseEffect {
		return this;
	}
	protected OnDestroy(): void {
		this.janitor.Cleanup();
	}

	private hookSignals() {
		this.janitor.Add(this.Destroyed.Connect(() => this.IsDestroyedAtom(true)));
		this.janitor.Add(() => this.Destroy());
		this.janitor.Add(() => this.Destroyed.Fire());
		this.janitor.Add(this.Destroyed);
	}
}
