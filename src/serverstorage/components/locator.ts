import { Dependency } from "@flamework/core";
import { BaseComponent, Component, type Components } from "@flamework/components";
import { $nameof } from "rbxts-transform-debug";
import { isVector3 } from "shared/utility/t-isA";
import { SuperJanitor } from "shared/classes/super-janitor";
import type { HurtboxService } from "serverstorage/services/hurtbox";

interface Attributes {
	lastTeleportedLocation: Vector3;
}

@Component({
	tag: $nameof<Locator>(),
	defaults: {
		lastTeleportedLocation: Vector3.zero,
	},
})
export class Locator extends BaseComponent<Attributes, RootPart> {
	public readonly teleportAllowed: boolean = false;
	private readonly character: CharacterModel = this.instance.Parent;
	public constructor(private readonly hurtbox: HurtboxService) {
		super();
	}
	public teleport(position: Vector3 | CFrame): void {
		if (isVector3(position)) position = new CFrame(position);
		this.allowTp(this.character, 4);
		this.character.PivotTo(position);
		this.hurtbox.update(this.character);
	}

	public lookAt(position: Vector3): void {
		this.character.PivotTo(CFrame.lookAt(this.instance.Position, position));
	}

	public async allowTp(this: Writable<Locator>, character: CharacterModel, duration?: number): Promise<void> {
		SuperJanitor.del(`${character.Name}_teleport`);
		SuperJanitor.set(`${character.Name}_teleport`, () => (this.teleportAllowed = false), duration);
		this.teleportAllowed = true;
		if (duration) {
			const promise = SuperJanitor.promise(`${character.Name}_teleport`);
			if (promise && promise.getStatus() === "Started") promise.await();
		}
	}

	public static create(character: CharacterModel): Locator {
		return Dependency<Components>().addComponent(character.HumanoidRootPart);
	}
}
