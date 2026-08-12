interface Workspace extends WorldModel {
	Spawns: Folder;
	FakeHeads: Folder;
	Effects: Folder & {
		FX: Folder;
	};
}
