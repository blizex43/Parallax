import { Dependency } from "@flamework/core";
import { $warn } from "rbxts-transform-debug";
import type { DataService } from "serverstorage/services/third-party/data";
import Log from "shared/log";
let dataService: DataService;
export = async function (query: string): Promise<void> {
	try {
		dataService ??= Dependency<DataService>();
		await dataService.query(query).then(([success, response]) => {
			if (!success) Log.fatal(`A Query Error has occured: ${response}`);
			else Log.info(`Query Success: ${response}`);
		});
	} catch (e) {
		$warn(e);
	}
};
