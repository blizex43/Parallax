export function now(sec?: boolean) {
	return sec ? DateTime.now().UnixTimestampMillis / 1000 : DateTime.now().UnixTimestampMillis;
}