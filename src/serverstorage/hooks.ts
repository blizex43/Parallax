import { WebsocketUtilities } from "shared/classes/websocket-utilities";
import type { PlayerData } from "shared/data-models/player-data";
import type { AttackContext, AttackDefinition, AttackLiterals, HitWindow } from "shared/structs/attack";
import type { NPCType } from "shared/structs/npc";
export interface OnPlayerLeave {
	onPlayerLeave(player: Player): void;
}

export interface OnPlayerJoin {
	onPlayerJoin(player: Player): void;
}

export interface OnCharacterDataLoad {
	onCharacterDataLoad(character: CharacterModel): void;
}
export interface OnNPCMade {
	onNPCMade(npc: NPCType): void;
}

export interface OnNPCDestroyed {
	onNPCDestroyed(npc: NPCType): void;
}

export interface OnCharmManagerCreated {
	onCharmManagerCreated(plaracter: Plaracter, manager: WebsocketUtilities): void;
}

export interface OnCharmManagerDestroyed {
	onCharmManagerDestroyed(plaracter: Plaracter, manager: WebsocketUtilities): void;
}

export interface OnDataUpdate {
	onDataUpdate(player: Player, data: PlayerData): void;
}

export interface OnDataLoad {
	onDataLoad(player: Player, data: PlayerData): void;
}

export interface OnMoveClassInvoked {
	invoked(attackDependencies: AttackContext): Promise<void>;
	cancelled(attackDependencies: AttackContext): void;
	winManipulate?(window: HitWindow, ...args: unknown[]): HitWindow;
	readonly nameof: AttackLiterals;
	readonly lib: AttackDefinition;
}
