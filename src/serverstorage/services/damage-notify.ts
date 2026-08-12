import { Service } from "@flamework/core";
import Signal from "@rbxts/signal";
import { HitData } from "shared/structs/attack";
import { DamageTree } from "shared/structs/damage";

@Service()
export class DamageNotifyService {
	public readonly notifyOnDamaged: Signal<(context: HitData, tree: DamageTree, damage: number) => void> =
		new Signal();
	public notify_damage(context: HitData, tree: DamageTree): void {
		return void (tree.damaged && this.notifyOnDamaged.Fire(context, tree, tree.damage));
	}
}
