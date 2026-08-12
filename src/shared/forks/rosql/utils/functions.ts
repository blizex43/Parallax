import { ReconcileUnadded } from "shared/utility/instance";
import type {
	ConditionalSymbolsType,
	DatastoreSQLConfig,
	RoSQLGetter,
	RoSQLKeywordsType,
	RoSQLNativeTypesType,
	ROSQLOptionsArchitecture,
	RoSQLSetter,
	UpdateAsyncFunctionType,
	UpdateAsyncProperties,
} from "../typings/rosql-types";
import { allowedConditionSymbols, allowedNativeType, allowedSQLKeywords, defaultSQLConfig } from "../enums";
import { LocalHost } from "./localhost";
import { appendWithSha256, stripParentheses } from "./regex-match";
import { objectSize } from "shared/utility/t-isA";
import { Players } from "@rbxts/services";
import { RoSQLManager } from "../manager";

export function getROSQLConfig(config: Partial<DatastoreSQLConfig> = defaultSQLConfig): DatastoreSQLConfig {
	return <DatastoreSQLConfig>(
		(<unknown>(
			ReconcileUnadded(
				<Record<string, unknown>>(<unknown>config),
				<Record<string, unknown>>(<unknown>defaultSQLConfig),
			)
		))
	);
}

export function isRoSQLDataType(input: string): boolean {
	return allowedNativeType.includes(<RoSQLNativeTypesType>stripParentheses(input));
}

export function isRoSQLOperationSymbol(input: string): boolean {
	return allowedConditionSymbols.includes(<ConditionalSymbolsType>input);
}

export function isRoSQLKeyword(input: string): boolean {
	return allowedSQLKeywords.includes(<RoSQLKeywordsType>input);
}

export function appendKeywordToMetaData<R extends ROSQLOptionsArchitecture>(
	metadata: R,
	keyword: RoSQLKeywordsType,
	value: string,
	index?: string,
	maxAllowed?: number,
): boolean {
	const metadataRecord = <Record<string, unknown>>(<unknown>metadata);
	const keywordIndex = <string>(metadataRecord["keywordIndexName"] ?? "keywords");
	const keywordTree = <Record<string, Record<string, string | undefined>>>(metadataRecord[keywordIndex] ?? {});
	const functionTree = <Record<string, string | undefined>>(keywordTree[keyword] ?? {});
	value = value === "NULL" ? <never>undefined : value;
	const treeSize = objectSize(functionTree);
	if (maxAllowed && treeSize === maxAllowed) return false;
	if (index) functionTree[index] = value;
	else {
		if (treeSize === 0) return false;
		for (const [key] of pairs(functionTree)) {
			functionTree[key] = value;
		}
	}
	keywordTree[keyword] = functionTree;
	metadataRecord[keywordIndex] = keywordTree;
	return true;
}

export function appendNativeTypeToMetaData<R extends ROSQLOptionsArchitecture>(
	metadata: R,
	index: string,
	nativeType: RoSQLNativeTypesType,
): boolean {
	const metadataRecord = <Record<string, unknown>>(<unknown>metadata);
	const dataTypeIndex = <string>(metadataRecord["dataTypeIndexName"] ?? "data-type-allocation");
	const dataTypeTree = <Record<string, string>>(metadataRecord[dataTypeIndex] ?? {});
	dataTypeTree[index] = nativeType;
	metadataRecord[dataTypeIndex] = dataTypeTree;
	return true;
}

export function removeNativeTypeFromMetaData<R extends ROSQLOptionsArchitecture>(metadata: R, index: string): R {
	const metadataRecord = <Record<string, unknown>>(<unknown>metadata);
	const dataTypeIndex = <string>(metadataRecord["dataTypeIndexName"] ?? "data-type-allocation");
	const dataTypeTree = <Record<string, string>>(metadataRecord[dataTypeIndex] ?? {});
	if (index in dataTypeTree) delete dataTypeTree[index];
	metadataRecord[dataTypeIndex] = dataTypeTree;
	return metadata;
}

export function validatedDataType(nativeType: RoSQLNativeTypesType): boolean {
	const input = stripParentheses(nativeType);
	return allowedNativeType.includes(<RoSQLNativeTypesType>input);
}

export function serverEligibleForQueueBypass(): boolean {
	return Players.GetPlayers().size() < 2;
}

export async function constructCustomUpdateAsync(
	manager: RoSQLManager,
	get: RoSQLGetter,
	set: RoSQLSetter,
): Promise<UpdateAsyncFunctionType> {
	const { configuration } = manager;
	const host = await LocalHost.getHost(configuration.localhostLockName);
	return async <T, M>(
		key: string,
		transformer: (oldData: Maybe<T>, oldMetaData?: Maybe<M>) => [Maybe<T>?, Maybe<M>?],
		properties: UpdateAsyncProperties = {
			useMetadata: true,
			prefix: "",
		},
	): Promise<Maybe<T>> => {
		const identification = appendWithSha256();
		const canUseMetaData =
			configuration.allowDataDecryption && configuration.allowDataEncryption && properties.useMetadata;
		while (true) {
			let acquired = true;
			if (!serverEligibleForQueueBypass()) {
				try {
					let queueOwner: string[] = [identification];
					queueOwner = await LocalHost.updateHost(
						host,
						configuration.localhostQueueName,
						(owner: string[]) => {
							owner ??= [];
							if (owner.includes(identification)) return owner;
							owner.push(identification);
							return owner;
						},
						configuration.localhostQueueTimeout,
					);
					acquired = queueOwner.shift() === identification;
				} catch (err) {
					print(`[ROSQL] queue unavailable, falling back directly`, err);
					acquired = true;
				}
			}

			if (acquired) {
				try {
					const oldData = <Maybe<T>>((await get<T>(`${properties.prefix}${key}`)) ?? []);
					const oldMetaData = <Maybe<M>>(
						(canUseMetaData ? ((await get<M>(`${configuration.metadataPrefix}${key}`)) ?? {}) : undefined)
					);
					// eslint-disable-next-line prefer-const
					let [newData, newMetaData] = transformer(oldData, oldMetaData);
					if (newData && manager.encryption!)
						for (const data of <Record<string, unknown>[]>newData) manager.encryption(data);
					await set(`${properties.prefix}${key}`, newData);
					if (newMetaData && canUseMetaData) await set(`${configuration.metadataPrefix}${key}`, newMetaData);
					return newData;
				} finally {
					if (!serverEligibleForQueueBypass()) {
						const result = await LocalHost.updateHost(
							host,
							configuration.localhostQueueName,
							(owner: string[]) => {
								owner ??= [];
								const index = owner.indexOf(identification);
								if (index !== -1) owner.remove(index);
								return owner;
							},
							configuration.localhostQueueTimeout,
						);
						print(`[ROSQL] queue cleanup finished for ${properties.prefix}${key}`, result);
					}
				}
			}
			task.wait(configuration.localhostPollingRate);
		}
	};
}
