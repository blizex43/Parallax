import type { Registry } from "@rbxts/cmdr";
import { RunService as Runtime } from "@rbxts/services";
import { DEVELOPERS } from "shared/constants";

const enum Message {
	NoPermission = "You do not have permission to execute this command!",
}

export = function (registry: Registry) {
	registry.RegisterHook("BeforeRun", (ctx) => {
		switch (ctx.Group) {
			case "Dev": {
				if (DEVELOPERS.has(ctx.Executor.UserId) || Runtime.IsStudio()) return;
				return Message.NoPermission;
			}
		}
		return;
	});
};
