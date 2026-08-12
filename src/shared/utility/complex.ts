export const multiplyNumberSequence = (sequence: NumberSequence, n: number): NumberSequence => {
	const keypoints = sequence.Keypoints.map((keypoint) => {
		return new NumberSequenceKeypoint(keypoint.Time, keypoint.Value * n, keypoint.Envelope * n);
	});

	return new NumberSequence(keypoints);
};
