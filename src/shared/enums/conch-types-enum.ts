import * as Conch from "@rbxts/conch";
type ConchTypeData = Parameters<typeof Conch.register_type>[1];
export const QuickRegisterConchType = (options: readonly string[], name: string, description?: string) =>
	Conch.register_type(name, <ConchTypeData>(<unknown>Conch.args.enum_new(<unknown[]>options, name, description)))(
		name,
		description,
	);
