import { Modding, Reflect } from "@flamework/core";
import { RunService as Runtime } from "@rbxts/services";
import { roundDecimal } from "./utility/numbers";
import Log from "./log";
import Charm from "@rbxts/charm";
import type Signal from "@rbxts/signal";
import { FlameworkIgnited } from "./constants";
import { callMethodOnDependencies } from "@rbxts/flamework-meta-utils";

/**
 * Request the required metadata for lifecycle events and dependency resolution.
 * @metadata flamework:implements flamework:parameters
 */
export const Singleton = Modding.createDecorator("Class", (descriptor) => {
	Reflect.defineMetadata(descriptor.object, "flamework:singleton", true);
});

/**
 * Wraps the function in a `task.spawn()`
 *
 * **Note:** Voids the return value
 * */
export const SpawnTask = Modding.createDecorator("Method", (descriptor) => {
	const object = <Record<string, Callback>>(<unknown>descriptor.constructor!);
	const originalMethod = object[descriptor.property];
	object[descriptor.property] = (...args: unknown[]) => {
		task.spawn(originalMethod, ...args);
	};
});

export const DeferTask = Modding.createDecorator("Method", (descriptor) => {
	const object = <Record<string, Callback>>(<unknown>descriptor.constructor!);
	const originalMethod = object[descriptor.property];
	object[descriptor.property] = (...args: unknown[]) => {
		task.defer(originalMethod, ...args);
	};
});

/** Calls `whenInvalid` when `validator` returns false */
export const ValidateReturn = Modding.createDecorator<
	[validator: (returnValue: unknown) => boolean, whenInvalid?: (returnValue: unknown) => void, warnNotError?: boolean]
>("Method", (descriptor, [validator, whenInvalid, warnNotError]) => {
	// FlameworkIgnited.Once(() => {
	const object = <Record<string, Callback>>(<unknown>descriptor.constructor!);
	const originalMethod = object[descriptor.property];
	warnNotError ??= false;
	whenInvalid ??= (value) =>
		Log[warnNotError ? "warn" : "fatal"](
			`Invalid return value ${value} returned by ${tostring(descriptor.constructor)}.${descriptor.property}()`,
		);

	object[descriptor.property] = function (...args: unknown[]) {
		const value = originalMethod(...args);
		const isValid = validator(value);
		if (!isValid) whenInvalid!(value);

		return value;
	};
	// });
});

/** Retries the function every time `retryCondition` returns true, `times` times, with `delay` seconds in between */
export const Retry = Modding.createDecorator<
	[times: number, delay?: number, retryCondition?: (fn: () => void) => boolean]
>("Method", (descriptor, [times, delay, retryCondition]) => {
	// FlameworkIgnited.Once(() => {
	const object = <Record<string, Callback>>(<unknown>descriptor.constructor!);
	const originalMethod = object[descriptor.property];
	delay ??= 0;
	retryCondition ??= (fn) => {
		try {
			fn();
			return false;
		} catch (e) {
			Log.fatal(`Failed to retry ${tostring(descriptor.constructor!)}.${descriptor.property}(): ${e}`);
			return true;
		}
	};

	object[descriptor.property] = function (...args: unknown[]) {
		const wrappedMethod = (...retryArgs: unknown[]) =>
			retryArgs.size() > 0 ? originalMethod(...retryArgs) : originalMethod(...args);
		let shouldRetry = retryCondition!(wrappedMethod); // calls originalMethod
		let retries = 0;
		while (shouldRetry && retries < times) {
			retries++;
			if (delay! > 0) task.wait(delay);

			shouldRetry = retryCondition!(wrappedMethod);
		}
	};
	// });
});

/** Only allows the function to be executed once every `length` seconds */
export const Cooldown = Modding.createDecorator<[length: number]>("Method", (descriptor, [length]) => {
	// FlameworkIgnited.Once(() => {
	let canCall = true;
	const object = <Record<string, Callback>>(<unknown>descriptor.constructor!);
	const originalMethod = object[descriptor.property];
	object[descriptor.property] = function (...args: unknown[]) {
		if (!canCall) return;
		canCall = false;
		task.delay(length, () => (canCall = true));

		return originalMethod(...args);
	};
	// });
});

/** Makes the function enter a seperate thread while waiting the set amount of `seconds` before executing */
export const Delay = Modding.createDecorator<[seconds: number]>("Method", (descriptor, [seconds]) => {
	// FlameworkIgnited.Once(() => {
	const object = <Record<string, Callback>>(<unknown>descriptor.constructor!);
	const originalMethod = object[descriptor.property];
	object[descriptor.property] = function (...args: unknown[]) {
		return task.delay(seconds, () => originalMethod(...args));
	};
	// });
});

/** Cache the first result the function returns and return the cached result from then on out */
export const Memoize = Modding.createDecorator<[]>("Method", (descriptor) => {
	// FlameworkIgnited.Once(() => {
	const object = <Record<string, Callback> & { __memoizationCache: Record<string, unknown> }>(
		(<unknown>descriptor.constructor!)
	);
	const originalMethod = object[descriptor.property];
	const key = tostring(originalMethod);

	object[descriptor.property] = function (this, ...args: unknown[]) {
		this.__memoizationCache ??= {};
		if (this.__memoizationCache[key] === undefined) {
			const result = originalMethod(this, ...args);
			this.__memoizationCache[key] = result;
		}

		return this.__memoizationCache[key];
	};
	// });
});

/** Only allows the function to be executed in studio */
export const StudioOnly = Modding.createDecorator<[]>("Method", (descriptor) => {
	// FlameworkIgnited.Once(() => {
	const object = <Record<string, Callback>>(<unknown>descriptor.constructor!);
	const originalMethod = object[descriptor.property];

	object[descriptor.property] = function (...args: unknown[]) {
		if (Runtime.IsStudio()) originalMethod(...args);
	};
	// });
});

/**
 * Benchmark how long the function takes to run
 * @metadata reflect identifier flamework:parameters
 */
export function LogBenchmark<Args extends unknown[] = unknown[]>(
	formatter?: (methodName: string, msElapsed: number, ...args: Args) => string,
) {
	return (
		ctor: object,
		propertyKey: string,
		descriptor: TypedPropertyDescriptor<(this: unknown, ...args: Args) => unknown>,
	) => {
		const object = <Record<string, Callback>>ctor;
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		formatter ??= (name, elapsed, ..._) => `Method "${name}" took ${roundDecimal(elapsed, 2)} ms to execute.`;

		object[propertyKey] = function (_: unknown, ...args: Args) {
			const startTime = os.clock();
			const result = descriptor.value(_, ...args);
			const endTime = os.clock();
			const elapsed = (endTime - startTime) * 1000;
			Log.info(formatter!(propertyKey, elapsed, ...args));
			return result;
		};
	};
}



/** This Decorator will not run the function if the function returns false. */
export const IgnoreIfNot = Modding.createDecorator<[boolCallback: () => boolean]>(
	"Method",
	(descriptor, [boolCallback]) => {
		FlameworkIgnited.Once(() => {
			const object = <Record<string, Callback>>(<unknown>descriptor.constructor!);
			const originalMethod = object[descriptor.property];
			object[descriptor.property] = function (...args: unknown[]) {
				if (boolCallback()) originalMethod(...args);
			};
		});
	},
);

/** This Decorator will run when a signal is fired. */

export function OnSignalSubscribed<O extends void | Promise<void> = void>(signal: Signal | RBXScriptSignal) {
	return (
		ctor: object,
		propertyKey: string,
		descriptor: TypedPropertyDescriptor<(this: unknown, ...input: unknown[]) => O>,
	) => {
		FlameworkIgnited.Once(() => {
			signal["Connect"]((...args: unknown[]) => callMethodOnDependencies(ctor, descriptor, ...args));
		});
	};
}

/** The function placed will only run if the active atom returns true. */
export function ActiveOnly<I extends unknown[] = unknown[], V extends void = void>(
	ctor: object & { active: Charm.Atom<boolean> },
	propertyKey: string,
	descriptor: TypedPropertyDescriptor<(this: unknown, ...input: I) => V>,
) {
	if (!("active" in ctor)) return;
	FlameworkIgnited.Once(() => {
		(<Record<string, Callback>>ctor)[propertyKey] = function (this, ...args: I): void {
			if (ctor.active()) return descriptor.value(this, ...args);
		};
	});
}

/** The given function the decorator is decorating will not run unless the amount is fullfilled.
 * @param signal The signal to listen to
 * @param amount The amount of times the signal must be fired before the function is called
 * @param buffer If true, the function will be called with the arguments of the last decorated function fired. If false, the decorator will not store the arguements for future use.
 */
export function OnSignalCounterReached<I extends unknown[] = unknown[], V extends void = void>(
	signal: Signal | RBXScriptSignal,
	amount = 1,
	buffer = false,
) {
	return (
		ctor: object,
		propertyKey: string,
		descriptor: TypedPropertyDescriptor<(this: unknown, ...input: I) => V>,
	) => {
		const object = <Record<string, Callback>>ctor;
		const originalMethod = descriptor.value!;

		let allowed = amount <= 0;
		let lastArgs: Maybe<[unknown, I]>;

		if (!allowed) {
			let counter = 0;

			const connection = signal.Connect(() => {
				counter++;

				if (counter >= amount) {
					connection.Disconnect();
					allowed = true;

					if (buffer && lastArgs) {
						const [thisValue, args] = lastArgs;
						originalMethod(thisValue, ...args);
						lastArgs = undefined;
					}
				}
			});
		}

		object[propertyKey] = function (this: unknown, ...args: I) {
			if (!allowed) {
				if (buffer) lastArgs = [this, args];

				return;
			}

			return originalMethod(this, ...args);
		};
	};
}
