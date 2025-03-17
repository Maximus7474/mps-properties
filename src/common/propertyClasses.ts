import { Vector4 } from '@nativewrappers/fivem';

export interface keyholder {
    canFurnish: boolean;
    canFinance: boolean;
    canGrantAccess: boolean;
}

export interface ClientPropertyData {
    id: number;
    houseNumber: string;
    type: "property" | "garage";
    address: string;
    location: Vector4;
    owner: string | null;
    group: string | null;
    keyholders: number[];
}

export interface Interiors {
    [key: string]: InteriorProps
}
export interface InteriorProps {
    name: string;
    type:  "garage" | "house" | "apartment";
    entrance: {x: number, y: number, z:number};
    building?: string;
    positions?: number[][]
}
export interface InteriorReference {
    type: "property" | "garage";
    ipl?: {
        name: string;
        colorref: string;
    };
    shell?: {
        model: string;
        position: Vector4;
    };
}

export interface Furniture {
    model: string;
    label?: string;
    offset: {x: number, y: number, z: number, w: number};
    code?: string;
    stash?: string;
    entity?: number;
}