import Log from "shared/log";
import { extractMethod } from "shared/utility/functions";
import { advmath } from "shared/utility/math";
import { isCFrame, isNumber, isVector3 } from "shared/utility/t-isA";
export interface SigmoidParams {
	sharpness: number;
	initTransition: number;
}
export class Sigmoid {
	public readonly transitionAlpha: number = 0; // 0 -> 1
	public readonly sharpness: number = 12; // sigmoid strength
	constructor(params: Maybe<Partial<SigmoidParams>> = <Maybe<Partial<SigmoidParams>>>{}) {
		this.postSigmoidParameters(this.fillSigmoidParameters(<SigmoidParams>params));
	}

	public play(): number {
		return this.sigmoid(this.transitionAlpha);
	}

	public playLerp<T extends number | CFrame | Vector3>(from: T, to: T, alpha?: number): T {
		if (typeOf(from) !== typeOf(to)) {
			return Log.fatal(
				`Issue in playLerp inside constructor <Sigmoid>: Both min and max types don't have the same value!`,
			);
		}
		return this.lerp(<never>from, <never>to, alpha ?? this.transitionAlpha) as T;
	}

	public setClampedTransitionAlpha(this: Writable<Sigmoid>, num: number): number {
		this.transitionAlpha = math.clamp(num, 0, 1);
		return this.transitionAlpha;
	}

	public getTransitionAlpha(): number {
		return this.transitionAlpha;
	}

	private sigmoid = extractMethod(advmath, "sigmoid");
	private lerp(a: number, b: number, t: number): number;
	private lerp(a: Vector3, b: Vector3, t: number): Vector3;
	private lerp(a: CFrame, b: CFrame, t: number): CFrame;
	private lerp(a: number | Vector3 | CFrame, b: number | Vector3 | CFrame, t: number): number | Vector3 | CFrame {
		if (t >= 0.997) return b;
		if (isNumber(a) && isNumber(b)) {
			return a + (b - a) * t;
		}

		if (isVector3(a) && isVector3(b)) {
			return a.Lerp(b, t);
		}

		if (isCFrame(a) && isCFrame(b)) {
			return a.Lerp(b, t);
		}

		return Log.fatal(`Issue in lerp inside <Sigmoid>: Unsupported lerp types (${typeOf(a)} and ${typeOf(b)}).`);
	}

	private fillSigmoidParameters(params: SigmoidParams): SigmoidParams {
		{
			params["sharpness"] = "sharpness" in params ? params.sharpness : this.sharpness;
			params["initTransition"] = "initTransition" in params ? params.initTransition : this.transitionAlpha;
		}
		return <SigmoidParams>params;
	}

	private postSigmoidParameters(this: Writable<Sigmoid>, params: SigmoidParams): void {
		this.sharpness = params.sharpness;
		this.transitionAlpha = params.initTransition;
	}
}
