import { Service } from "@flamework/core";
import { Players } from "@rbxts/services";
import { Events } from "serverstorage/network";
import { Replicator, SerializedReplicator } from "shared/classes/replicable";
import type { LogStart } from "shared/hooks";
import { Serializers } from "shared/network";
import type { AnimationOffsets, AnimationTrackNames } from "shared/structs/animation";
import { getClosestPlayers } from "shared/utility/instance";

@Service()
export class AnimationReplicatorService extends SerializedReplicator implements LogStart {
	public constructor() {
		super(Events.animation.replicate, Events.animation.played);
	}

	public replicate(
		character: CharacterModel,
		animName: AnimationTrackNames,
		play: boolean = true,
		stopOthers: boolean = true,
		blacklist: CharacterModel[] = [character],
		offsets: AnimationOffsets = { speed: 1, fade: 1 },
		ignoreSpecificPlayers: boolean = false,
	) {
		const possiblePlayers = !ignoreSpecificPlayers
			? getClosestPlayers(character, Replicator.replicationOptions.range ?? 40, blacklist)
			: Players.GetPlayers();
		print(possiblePlayers);
		if (possiblePlayers.size() === 0) return;
		const serialized = Serializers.animation.serialize({
			name: animName,
			options: {
				stopOthers,
				offsets,
				play,
				character,
			},
		});
		for (const player of possiblePlayers) {
			Events.animation.replicate.predict(player, serialized);
			Events.animation.played.fire(player, serialized);
		}
	}
}
