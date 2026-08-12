type HumanoidInstance = Humanoid & { Parent: CharacterModel };
type Plaracter = CharacterModel | Player;
interface CharacterModel extends Model {
	Humanoid: Humanoid & {
		Animator: Animator;
	};
	HumanoidRootPart: RootPart;
	Head: BasePart & {
		Mesh: SpecialMesh;
	};
}

interface RootPart extends BasePart {
	RootJoint: Motor6D;
	RootAttachment: Attachment;
	Parent: CharacterModel;
}

interface ToggleSwitchButton extends ImageButton {
	UIPadding: UIPadding;
	UICorner: UICorner;
	UIStroke: UIStroke;
	UIAspectRatioConstraint: UIAspectRatioConstraint;
	Node: Frame & {
		UICorner: UICorner;
		UIStroke: UIStroke;
		UIAspectRatioConstraint: UIAspectRatioConstraint;
	};
}
