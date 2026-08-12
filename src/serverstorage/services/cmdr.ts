import { Service, type OnInit } from "@flamework/core";
import { Cmdr } from "@rbxts/cmdr";
import { getInstanceAtPath } from "shared/utility/meta";

@Service()
export class CmdrService implements OnInit {
	public onInit(): void {
		this.register();
	}

	private register() {
		Cmdr.RegisterTypesIn(getInstanceAtPath("src/serverstorage/cmdr/types")!);
		Cmdr.RegisterCommandsIn(getInstanceAtPath("src/serverstorage/cmdr/commands")!);
		Cmdr.RegisterHooksIn(getInstanceAtPath("src/serverstorage/cmdr/hooks")!);
	}
}