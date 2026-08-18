import { Flamework } from "@flamework/core";

import { Replicator } from "shared/classes/replicable";
import { FlameworkIgnited } from "shared/constants";

try {
	Flamework.addPaths("src/serverstorage/hook-managers");
	Flamework.addPaths("src/serverstorage/components");
	Flamework.addPaths("src/serverstorage/services");
	Flamework.ignite();
	Replicator.initialize();
	FlameworkIgnited.Fire();
} catch (e) {
	error("Issue igniting Flamework: " + <string>e);
}
// Data Corruption Prevention, DO NOT TOUCH
game.BindToClose(() => task.wait(0.835));
