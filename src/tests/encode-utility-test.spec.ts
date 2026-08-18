import { Fact, Assert, Theory, InlineData } from "@rbxts/runit";
import { tocolor3 } from "shared/utility/color";
import { tovector } from "shared/utility/vector";
class EncodeUtilityTest {
	@Fact
	public defineEncodedColor3(): void {
		const colorString = "Color3(1,1,1)";
		Assert.equal(new Color3(1, 1, 1), tocolor3(colorString));
	}

	@Theory
	@InlineData("Vector3(25,25,25)", new Vector3(25, 25, 25))
	@InlineData("Vector2(25,45)", new Vector2(25, 45))
	public defineEncodedVector(vectorString: string, expected: Vector3 | Vector2) {
		const vector = tovector<typeof expected>(vectorString);
		Assert.equal(expected, vector);
	}
}

export = EncodeUtilityTest;
