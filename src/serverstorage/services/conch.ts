import { OnInit, Service } from "@flamework/core";
import * as Conch from "@rbxts/conch";
import { ConchRegistry } from "serverstorage/enums/conch-enum";
import type { OnPlayerJoin } from "serverstorage/hooks";
import { ConchRoleInformation } from "shared/enums/conch-enum";
@Service()
export class ConchService implements OnPlayerJoin, OnInit {
	public async onInit(): Promise<void> {
		this.register();
	}

	public async onPlayerJoin(player: Player): Promise<void> {
		await this.processPlayer(player);
	}

	public register(): void {
		Conch.initiate_default_lifecycle();
		this.massRegisterCommands();
		this.massSetRolePermissions();
	}

	private massRegisterCommands(): void {
		for (const [name, data] of pairs(ConchRegistry)) {
			const { permissions, callback } = data;
			print(permissions);
			Conch.register(name, { permissions, arguments: <() => LuaTuple<Conch.Type[]>>data.arguments, callback });
		}
	}

	private massSetRolePermissions(): void {
		for (const [role, data] of pairs(ConchRoleInformation)) {
			Conch.set_role_permissions(role, ...data.permissions);
		}
	}

	private async processPlayer(player: Player): Promise<void> {
		const user = this.getUser(player);
		const cachedGroups: Record<number, boolean> = {};
		const cachedGroupRoles: Record<number, string> = {};
		Conch.give_roles(user, "visitor");
		for (const [role, data] of pairs(ConchRoleInformation)) {
			if (
				(data.userId && data.userId.includes(player.UserId)) ||
				(data.userName && data.userName.includes(player.Name))
			) {
				Conch.give_roles(user, role);
				continue;
			}
			if (data.groupId)
				for (const groupId of data.groupId) {
					cachedGroups[groupId] =
						groupId in cachedGroups && cachedGroups[groupId] ? true : player.IsInGroupAsync(groupId);
					if (cachedGroups[groupId]) {
						if (data.groupRoles) {
							for (const groupRole of data.groupRoles) {
								cachedGroupRoles[groupId] =
									groupId in cachedGroupRoles && cachedGroupRoles[groupId]
										? cachedGroupRoles[groupId]
										: player.GetRoleInGroupAsync(groupId);
								if (cachedGroupRoles[groupId] === groupRole) {
									Conch.give_roles(user, role);
									break;
								}
							}
							continue;
						}
						Conch.give_roles(user, role);
						continue;
					}
				}
		}
		print(user)
	}

	private getUser(player: Player): Conch.User {
		return Conch.get_user(player);
	}
}
