export declare interface Settings {
    /** The tag or name of the object to find. */
    Tag: string;
    Minimum_Stationary_Length: number;
    /** Reveal if the debug lines should be visible or not. */
    Debug_Visible: boolean;
    Debug_Instance_Raycast_Destroy_Time: number;
    Debug_Instance_Spherecast_Destroy_Time: number;
    Debug_Instance_Blockcast_Destroy_Time: number;
    Debug_Instance_Transparency: number;
    Debug_Instance_Color: Color3;
    Debug_Instance_Hit_Color: Color3;
    /** Only applies to Raycast lines */
    Debug_Instance_Raycast_Width: number;
    Debug_Instance_Derender_Location: CFrame;
}

export declare const defaultSettings: {
	/** The tag or name of the object to find. */
    Tag: "DmgPoint";
    Minimum_Stationary_Length: 1;
    /** Reveal if the debug lines should be visible or not. */
    Debug_Visible: false;
    Debug_Instance_Raycast_Destroy_Time: 1;
    Debug_Instance_Spherecast_Destroy_Time: 0.1;
    Debug_Instance_Blockcast_Destroy_Time: 0.1;
    Debug_Instance_Transparency: 0.3;
    Debug_Instance_Color: Color3;
    Debug_Instance_Hit_Color: Color3;
    /** Only applies to Raycast lines */
    Debug_Instance_Raycast_Width: 10;
    Debug_Instance_Derender_Location: CFrame;
}