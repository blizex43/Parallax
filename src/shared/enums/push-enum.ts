export const enum DashProperties {
	Duration = 0.18,
	Power = 65,
	Percent = 5,
	Cooldown = 1.7,
}
export const PushInstanceEnum = <const>{
	Enabled: false,
	ForceLimitMode: Enum.ForceLimitMode.PerAxis,
	VelocityConstraintMode: Enum.VelocityConstraintMode.Vector,
	RelativeTo: Enum.ActuatorRelativeTo.Attachment0,
	MaxAxesForce: new Vector3(200000, 0, 200000),
};
export const HardDashDebounce = 0.1;
export const DefaultDashProperties = {
	direction: "Back",
	duration: DashProperties.Duration,
	power: 65,
	vector: Vector3.zero,
	unturnable: false,
	useVector: false,
};
