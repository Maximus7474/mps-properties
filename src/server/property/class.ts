import { Vector3, Vector4 } from '@nativewrappers/fivem';
import { addNewProperty, deleteProperty, getParkedVehicles, saveProperty } from './db';
import type { ClientPropertyData, Furniture, InteriorProps, InteriorReference, Interiors, keyholder } from '@common/propertyClasses';
import { GetPlayer } from '@overextended/ox_core/server';

import interiorsData from '../../../static/interiors.json';
import { distVector3s } from 'utils';
import { VehicleData } from '@common/garageTypes';
const interiors = interiorsData as Interiors;

const bucketGap = GetConvarInt('properties:bucketGaps', 1);
const startingBucket = GetConvarInt('properties:startingBucket', 100) - bucketGap;

export enum PropertyStatus {
    BOUGHT = "bought",
    FOR_SALE = "for_sale",
    FOR_RENTAL = "for_rental",
    RENTED = "rented"
}

export interface IProperty {
    id: number;
    houseNumber: string;
    address: string;
    status: PropertyStatus;
    expiryDate?: Date;
    location: Vector4;
    interior: InteriorReference;
    furniture: Array<any> | null;
    owner: string | null;
    group: string | null;

    enterPlayer(source: number): void;
    ringDoorbell(source: number): void;
    updateFurniture(newFurniture: Array<any>): void;
    getFurniture(): Array<any> | null;
}

export class Property implements IProperty {
    id: number;
    houseNumber: string;
    address: string;
    status: PropertyStatus;
    expiryDate?: Date;
    location: Vector4;
    interior: InteriorReference;
    furniture: Array<any> | null;
    owner: string | null;
    group: string | null;
    keyholders: Map<number, keyholder>;

    doorbellPool: Map<number, NodeJS.Timeout>;
    inside: number[];

    constructor(
        id: number|null,
        houseNumber: string,
        address: string,
        status: PropertyStatus,
        location: Vector4,
        interior: InteriorReference,
        furniture: Array<any> | null = null,
        owner: string | null = null,
        group: string | null = null,
        keyholders: Map<number, keyholder>,
        expiryDate?: Date
    ) {
        this.id = id;
        this.houseNumber = houseNumber;
        this.address = address;
        this.status = status;
        this.location = location;
        this.interior = interior;
        this.furniture = furniture;
        this.owner = owner;
        this.group = group;
        this.keyholders = keyholders || new Map<number, keyholder>();
        this.expiryDate = expiryDate;

        this.doorbellPool = new Map<number, NodeJS.Timeout>();

        this.inside = [];
    }

    setId(id: number): void {
        if (this.id) return;
        this.id = id;
        return;
    }

    async enterPlayer(source: number): Promise<[boolean, Furniture[], VehicleData[]]> {
        console.log(`Player ${source} is entering property ${this.houseNumber}.`);

        const player = GetPlayer(source);
        const [x, y, z] = GetEntityCoords(player.ped);
    
        const distance = distVector3s(new Vector3(x, y, z), this.location);
    
        if (distance > 4) {
            console.log('Too far away', source, 'from houseNumber', this.houseNumber, 'distance:', distance);
            return [false, [], []];
        }

        let vehicles: VehicleData[] = [];
        if (this.interior.type === 'garage') {
            vehicles = await getParkedVehicles(this.id);
            // console.log(vehicles.length, vehicles.map(e => e.plate));
        }
        
        if (this.interior.ipl) {
            const interiorData: InteriorProps = interiors[this.interior.ipl.name];
            const { entrance } = interiorData;
            const entity = GetPlayerPed(source.toString());
            SetEntityRoutingBucket(entity, startingBucket + bucketGap + this.id);
            SetEntityCoords(entity, entrance.x, entrance.y, entrance.z, true, true, true, false);

            this.inside.push(source);

            return [true, this.furniture, vehicles];
        }
        return [false, this.furniture, []];
    }

    exitPlayer(source: number): void {
        console.log(`Player ${source} is leaving property ${this.houseNumber}.`);
        if (this.interior.ipl) {
            const { location } = this;
            const entity = GetPlayerPed(source.toString());

            SetEntityRoutingBucket(entity, 0);
            SetEntityCoords(entity, location.x, location.y, location.z, true, true, true, false);
            
            const i = this.inside.indexOf(source);
            if (i !== -1) {
                this.inside.splice(i, 1);
            }
        }
    }

    ringDoorbell(source: number): 1|false {
        if (!this.owner && !this.group) return false;

        const timeout = setTimeout(() => {
            this.doorbellPool.delete(source);
            console.log(`Player ${source} was removed from the doorbell pool at property ${this.houseNumber} due to timeout.`);
        }, 5 * 60 * 1000);

        this.doorbellPool.set(source, timeout);
        
        console.log(`Player ${source} rang the doorbell at property ${this.houseNumber}.`);
        emitNet('ox_lib:notify', source, {
            title: 'Doorbell',
            description: `You just rang the doorbell at #${this.id}`,
            type: 'info'
        })
        return 1;
    }

    getDoorbellPool(): number {
        return this.doorbellPool.size;
    }

    allowDoorbellEntry(source: number): void {
        const timeout = this.doorbellPool.get(source);
        if (timeout) {
            clearTimeout(timeout);
            this.doorbellPool.delete(source);
            this.enterPlayer(source);
        }
    }

    denyDoorbellEntry(source: number): void {
        const timeout = this.doorbellPool.get(source);
        if (timeout) {
            clearTimeout(timeout);
            this.doorbellPool.delete(source);
            console.log(`Player ${source} was denied access and removed from the doorbell pool at property ${this.houseNumber}.`);
        }
    }

    updateFurniture(newFurniture: Array<any>): void {
        this.furniture = newFurniture;
        console.log(`Furniture updated for property ${this.houseNumber}.`);
    }

    getFurniture(): Array<any> | null {
        return this.furniture;
    }
}

export class PropertyManager {
    private properties: Map<number, Property>;

    constructor() {
        this.properties = new Map<number, Property>();
    }

    loadProperties(properties: Property[]): void {
        properties.forEach(property => this.properties.set(property.id, property));
        console.log(properties.length, 'properties loaded into PropertyManager.');
    }

    getProperties(): ClientPropertyData[] {
        const propertiesMap: ClientPropertyData[] = [];

        this.properties.forEach((property, id) => {
            propertiesMap.push({
                id: id,
                houseNumber: property.houseNumber,
                address: property.address,
                location: property.location,
                type: property.interior.type,
                owner: property.owner,
                group: property.group,
                keyholders: Array.from(property.keyholders.keys())
            });
        });

        return propertiesMap;
    }

    async addProperty(
        houseNumber: string | null,
        address: string,
        status: PropertyStatus,
        location: Vector4,
        interior: InteriorReference,
        furniture: Array<any> | null = null,
        owner: string | null = null,
        group: string | null = null,
        expiryDate?: Date
    ): Promise<Property> {
        if (houseNumber) {
            const id = this.properties.size + 1;
            const property = new Property(id, houseNumber, address, status, location, interior, furniture, owner, group, new Map<number, keyholder>(), expiryDate);
            this.properties.set(id, property);
            return property;
        } else {
            const property = new Property(null, houseNumber, address, status, location, interior, furniture, owner, group, new Map<number, keyholder>(), expiryDate);
            
            try {
                const id = await addNewProperty(property);
                property.setId(id);
                this.properties.set(id, property);
                return property;
            } catch (err) {
                console.error('Unable to add new property:', err);
                throw err;
            }
        }
    }

    getPropertyById(houseId: number): Property | undefined {
        return this.properties.get(houseId);
    }

    async saveAll(): Promise<void> {
        let saved: number = 0;
        for (const [id, property] of this.properties.entries()) {
            property.inside.forEach((src) => {
                console.log('Removing player:', src, 'from property:', id);
                property.exitPlayer(src);
            });
            await this.savePropertyToDB(id, property);
            saved++;
        }
        console.log(saved, `properties saved to the database`);
    }

    async deleteProperty(houseId: number): Promise<void> {
        const property = this.properties.get(houseId);
        if (property) {
            await this.deletePropertyFromDB(houseId);
            this.properties.delete(houseId);
            console.log(`Property with ID ${houseId} deleted.`);
        } else {
            console.log(`Property with ID ${houseId} not found.`);
        }
    }

    private async savePropertyToDB(id: number, property: Property): Promise<void> {
        saveProperty(id, property);
    }

    private async deletePropertyFromDB(houseId: number): Promise<void> {
        deleteProperty(houseId);
        console.log(`Deleting property ID ${houseId} from the database.`);
    }
}
