import type { CommandContext } from "@rbxts/cmdr";
import { Dependency } from "@flamework/core";
import { $warn } from "rbxts-transform-debug";
import type { DataService } from "serverstorage/services/third-party/data";

export = function (context: CommandContext, query: string): void {
	try {
		const data = Dependency<DataService>();
		data.query(query).then(([success, response]) => {
			if (!success) context.Reply(`A Query Error has occured: ${response}`, Color3.fromRGB(255, 0, 0));
			else context.Reply(`Query Success: ${response}`, Color3.fromRGB(0, 255, 0));
		});
	} catch (e) {
		$warn(e);
	}
};
