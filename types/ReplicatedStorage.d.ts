interface ReplicatedStorage {
	Assets: Folder & {
		VFX: Folder & {
			Movement: Folder & {
				Footstep: Folder & {
					FootStepFx: BasePart & {
						Grassy: Attachment;
						Normal: Attachment;
						Wet: Attachment;
					};
				};
				Dash: BasePart;
			};

			Combat: Folder & {
				Trails: Folder;
				GuardBreak: Folder;
				Critical: Folder;
				LightHit: Folder;
				Clash: Folder;
			};
		};
		Sounds: Folder & {
			Combat: Folder;
			Environment: Folder;
			Footstep: Folder & {
				Concrete: Sound;
				Dirt: Sound;
				Grass: Sound;
				Sand: Sound;
				Wood: Sound;
			};
		};
	};
	LuaBindables: Folder & {
		onDataUpdated: BindableEvent;
	};
}
