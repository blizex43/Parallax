interface ServerStorage {
	Modules: Folder;
	Assets: Folder & {
		Models: Folder & {
			Dummies: Folder;
		};
		FakeHead: Folder & {
			PlayerName: Model & {
				FakeHumanoid: Humanoid;
				Head: FakeHeadInstance;
			};
			Head: FakeHeadInstance;
		};
		Animations: Folder & {
			Styles: Folder;
			Movement: Folder;
			Combat: Folder;
		};
		Faces: Folder & {
			Female: FaceDescendants;
			Male: FaceDescendants;
			Markings: Folder;
		};
	};
}

interface FakeHeadInstance extends BasePart {
	WeldConstraint: WeldConstraint;
}

interface FaceDescendants extends Folder {
	Blinks: Folder;
	Eyes: Folder;
	Mouths: Folder;
	Noses: Folder;
	Pupils: Folder;
}
