import { VehicleProperties } from "@overextended/ox_lib";

export interface VehicleData {
    id: number;
    owner?: number;
    group?: string;
    plate: string;
    vin: string;
    model: string;
    data: { properties: VehicleProperties; [key: string]: any };
};