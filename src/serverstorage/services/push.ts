import { Service } from "@flamework/core";
import { Players } from "@rbxts/services";
import { Events } from "serverstorage/network";
import { Mover } from "shared/components/mover";
import { OnCharacterAdd, OnCharacterRemove } from "shared/hooks";
import { Serializers } from "shared/network";
import { PushPacket } from "shared/structs/packets";
import { getClosestPlayers } from "shared/utility/instance";
import { PartService } from "./part";

@Service()
export class PushService implements OnCharacterAdd, OnCharacterRemove {
	private readonly movers: Map<CharacterModel, Mover> = new Map();
	public constructor(private readonly part: PartService) {}
	public onCharacterAdd(character: CharacterModel): void {
		this.giveMover(character);
	}

	public onCharacterRemove(character: CharacterModel): void {
		this.destroyMover(character);
	}

	public set(
		character: CharacterModel,
		packet: PushPacket = {},
		play: boolean = true,
		ownerify: boolean = true,
	): void {
		const player = Players.GetPlayerFromCharacter(character);
		if (player) Events.push.run(player, Serializers.push.serialize(packet));
		else {
			const mover = this.getMover(character);
			if (!mover) return;
			if (packet) mover.set(packet);
			if (play) {
				if (ownerify) {
					const possiblePlayer = getClosestPlayers(character, 50)[0];
					if (possiblePlayer) this.part.ownerifyDescendants(character, possiblePlayer);
				} else this.part.ownerifyDescendants(character);
				mover.playExtern(true);
			}
		}
	}

	public giveMover(character: CharacterModel): Mover {
		const mover = Mover.create(character);
		this.movers.set(character, mover);
		return mover;
	}

	public getMover(character: CharacterModel): Maybe<Mover> {
		return this.movers.get(character);
	}

	public destroyMover(character: CharacterModel): void {
		const mover = this.getMover(character);
		if (mover) mover.onDestroy();
		return void this.movers.delete(character);
	}
}
