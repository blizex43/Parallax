import { TestRunner } from "@rbxts/runit";
import { ServerStorage } from "@rbxts/services";

const testRunner = new TestRunner(ServerStorage.WaitForChild("Tests"));
print("Running Tests!");
testRunner.run({ colors: true });
