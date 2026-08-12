export declare type Hitbox = {
	Instance?: Instance,
	RaycastParams?: RaycastParams,
	RaycastResult?: RaycastResult,
	Active: boolean,
	Resolution: number,
	CastData: CastData,
	Attributes: {[key: string]: any},
	FilterPartsHit: boolean,
	
	GetAllSegments(): Map<Instance,Segment>, // { [key: Instance]: Segment } won't work
	GetSegment(instance: Instance): Segment,
	AddSegment(descendant: any): Segment,
	RemoveSegment(descendant: any): Hitbox,
	Reconcile(): void,
	HitStart(timer?: number, raycastParams?: RaycastParams): Hitbox,
	HitStop(): Hitbox,
	Destroy(): void,
	SetResolution(resolution: number): Hitbox,
	SetCastData(castData: CastData): Hitbox,
	BeforeStart(startCallback: StartCallback): Hitbox,
	OnUpdate(updateCallback: UpdateCallback): Hitbox,
	OnHit(hitCallback: HitCallback): Hitbox,
	OnStopped(stopCallback: StopCallback): Hitbox,
}

export declare type Segment = {
	Instance: any,
	Distance: number,
	Position?: Vector3,
	LastDirection: Vector3,
	RaycastResult?: RaycastResult,
	CastData: CastData,
	_update: (self: Segment) => void,
}

export declare type CastData = {
	CastType: string,
	CFrame: CFrame,
	Size: Vector3,
	Radius: number,
	_LastCFrameBlockCast?: CFrame,
}

export declare type AdornmentData = {
	Adornment: LineHandleAdornment,
	LastUse: number,
}

export declare type SphereAdornmentData = {
	Adornment: SphereHandleAdornment,
	LastUse: number,
}

export declare type BoxAdornmentData = {
	Adornment: BoxHandleAdornment,
	LastUse: number,
}

export declare type StartCallback = () => void
export declare type UpdateCallback = (delta: number) => void
export declare type HitCallback = (raycastResult: RaycastResult, segmentHit: Segment) => void
export declare type StopCallback = (clearCallbacks: unknown) => void // TODO figure out what type this is