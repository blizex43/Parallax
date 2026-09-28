import { Controller, type OnStart } from "@flamework/core";
import * as Conch from "@rbxts/conch";
import * as ConchUI from "@rbxts/conch-ui";
import { ConchKeybind } from "shared/enums/conch-enum";
import "shared/enums/conch-types-enum";

@Controller()
export class ConchController implements OnStart {
	public async onStart(): Promise<void> {
		Conch.initiate_default_lifecycle();
		ConchUI.bind_to(ConchKeybind);
	}
}
