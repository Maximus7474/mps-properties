import { Vector3, Vector4 } from '@nativewrappers/fivem';
import lib, { Point, triggerServerCallback, notify, sleep, cache, VehicleProperties, waitFor } from '@overextended/ox_lib/client'
import { ClientPropertyData, Furniture, Interiors } from 'propertyClasses';
import { Ox } from '@overextended/ox_core';
import { VehicleData } from '@common/garageTypes';

import interiorsData from '../../../static/interiors.json';
import { LoadModel } from 'utils';
const interiors = interiorsData as Interiors;

let currentPropertyId: number|false = false;

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

export interface IProperty {
    id: number;
    houseNumber: string;
    address: string;
    location: Vector4;
    owner: string | null;
    group: string | null;
}

export class Property implements IProperty {
    id: number;
    houseNumber: string;
    address: string;
    location: Vector4;
    owner: string | null;
    group: string | null;
    keyholders: number[];
    type: "property" | "garage";
    point: Point;
    targets: {[key: string]: any};
    blip?: number;
    vehicles: Map<number, number>; /* key: entity ID, value: DB ID */
    garageExitInterval: CitizenTimer | null;
    furniture: Furniture[];
    interiorData?: InteriorReference;

    constructor(
        id: number|null,
        houseNumber: string,
        address: string,
        location: Vector4,
        type: "property" | "garage",
        owner: string | null = null,
        group: string | null = null,
        keyholders: number[]
    ) {
        this.id = id;
        this.houseNumber = houseNumber;
        this.address = address;
        this.location = location;
        this.type = type;
        this.owner = owner;
        this.group = group;
        this.keyholders = keyholders;
        this.furniture = [];

        this.vehicles = new Map<number, number>();

        this.point = new Point({
            coords: [location.x, location.y, location.z],
            distance: 50,
            onEnter: () => {
                const options: any[] = [
                    {
                        label: `Entrer dans ${this.type === "garage" ? "le Garage" : "la Propriété"}`,
                        icon: this.type === "garage" ? "fa-solid fa-warehouse" : "fa-solid fa-house",
                        onSelect: this.enterProperty.bind(this),
                        canInteract: () => {
                            if (this.type === 'property') return true;

                            const ped: number = PlayerPedId();
                            const vehicle: number = GetVehiclePedIsIn(ped, false);
                            return vehicle === 0;
                        }
                    }
                ];
        
                if (this.type === 'garage') options.push({
                    label: 'Garer votre véhicule',
                    icon: 'fa-solid fa-car-side',
                    onSelect: this.parkVehicle.bind(this),
                    canInteract: () => {
                        const ped: number = PlayerPedId();
                        const vehicle: number = GetVehiclePedIsIn(ped, false);
                        return vehicle !== 0 && GetPedInVehicleSeat(vehicle, -1) === ped;
                    }
                });
        
                exports.ox_target.addSphereZone({
                    coords: new Vector3(this.location.x, this.location.y, this.location.z),
                    name: `property-enter-${this.id}`,
                    radius: 2,
                    options: options
                });
            },
            onExit: () => {
                exports.ox_target.removeZone(`property-enter-${this.id}`);
            }
        });

        const player = Ox.GetPlayer();

        if (player.charId === this.owner || (this.group && player.getGroup(this.group)) || this.keyholders.includes(player.charId)) {
            this.blip = AddBlipForCoord(this.location.x, this.location.y, this.location.z);
            SetBlipSprite(this.blip, this.type === "garage" ? 357 : 40);
            SetBlipColour(this.blip, (this.group && player.getGroup(this.group)) ? 2 : 3);
            SetBlipScale(this.blip, 0.8);
            SetBlipAsShortRange(this.blip, true);
            AddTextEntry(`property_${this.id}`, `#${this.id} ${this.address}`);
            BeginTextCommandSetBlipName(`property_${this.id}`);
            EndTextCommandSetBlipName(this.blip);
        }
    }

    // -604.6424, -783.4582, 25.4038, 1.5771

    async enterProperty(): Promise<void> {

        const interiorData = await triggerServerCallback<1|false|InteriorReference>('properties:enterPropertyPhase1', 10000, this.id);

        /* Have a check, if he rings the bell shouldn't progress further */
        if (typeof interiorData !== 'object') return;
        if (!interiorData) return notify({
            title: "Impossible",
            description: "La maison semble pas occupé",
            type: 'inform'
        });

        this.interiorData = interiorData;

        /* Temporary to avoid issues with shell entries */
        if (!this.interiorData.ipl) return console.log('Not possible to enter this property');

        DoScreenFadeOut(250);
        await sleep(250);

        const interior = interiors[this.interiorData.ipl.name];

        /* Add better system to either set up colorref in the appartment/garage when IPL */
        /* Spawn Model of the interior */

        /* Convert to simple event ? - Edit: fuck it*/
        /* Mainly to set bucket and inform server he's inside */
        const result: any = (await triggerServerCallback<[boolean, Furniture[], VehicleData[]]>(
            'properties:enterPropertyPhase2',
            10000,
            this.id
        )) || [false, []];
            
        const [hasEntered, furniture, vehicles] = result;

        if (furniture && furniture.length > 0) {
            this.furniture = furniture;
            await this.loadFurniture();
        }

        if (this.type === "garage" && interior?.positions) {
            this.vehicles = new Map(
                (
                    await Promise.all(
                        interior.positions.map(async (position: number[], i: number) => {
                            const vehicle = vehicles[i];
                            if (!vehicle) return null;
            
                            await LoadModel(vehicle.model);
            
                            const entityId = CreateVehicle(
                                GetHashKey(vehicle.model),
                                position[0], position[1], position[2] - 0.48, position[3],
                                false, false
                            );
            
                            if (!DoesEntityExist(entityId)) {
                                console.log('^1Warning^7, unable to spawn the vehicle with plate:', vehicle.plate, 'entityId:', entityId, 'model:', vehicle.model);
                                return null;
                            }
            
                            try {
                                lib.setVehicleProperties(entityId, vehicle.data.properties);
                            } catch (err) {
                                console.log(typeof vehicle.data, vehicle);
                                console.error('Unable to set properties', err);
                            }
                            FreezeEntityPosition(entityId, true);
            
                            return { entityId, vehicleId: vehicle.id };
                        })
                    )
                )
                    .filter((result): result is { entityId: number; vehicleId: number } => result !== null)
                    .map(({ entityId, vehicleId }) => [entityId, vehicleId])
            );
            
            const playerPed: number = cache.ped || PlayerPedId();
            this.garageExitInterval = setInterval((async () => {
                const vehicle: number = GetVehiclePedIsIn(playerPed, false);
                if (vehicle && vehicle !== 0 && IsControlJustPressed(0, 71)) {
                    DeleteEntity(vehicle);
                    emitNet('properties:leaveGarageWithVehicle', this.id, this.vehicles.get(vehicle));
                    await this.exitProperty();
                }
            }).bind(this as IProperty), 0);
            
        }

        await sleep(250);
        DoScreenFadeIn(250);
        if (!hasEntered) return notify({
            description: 'L\'entrée est pas possible',
            type: 'error'
        });

        await sleep(250);

        const { entrance } = interior;
        /* To Do: add a system to store vehicles in the garage only if applicable */
        /* Ideally generate the options table outside the export call */
        /* Why the fuck did I write this here ? */
        exports.ox_target.addSphereZone({
            coords: new Vector3(entrance.x, entrance.y, entrance.z),
            name: `property-inside-${this.id}`,
            radius: 2,
            options: [
                {
                    label: `Sortir du ${this.type === "garage" ? "Garage" : "la Propriété"}`,
                    icon: this.type === "garage" ? "fa-solid fa-warehouse" : "fa-solid fa-house",
                    onSelect: this.exitProperty.bind(this)
                }
            ]
        });

        currentPropertyId = this.id;
    }

    async exitProperty(): Promise<void> {

        if (this.garageExitInterval) clearInterval(this.garageExitInterval);

        DoScreenFadeOut(250);
        await sleep(250);

        this.clearFurniture();
        const hasLeft = triggerServerCallback<boolean>('properties:leaveProperty', null, this.id);

        await sleep(250);
        DoScreenFadeIn(250);

        if (hasLeft) {
            exports.ox_target.removeZone(`property-inside-${this.id}`);
            for (const key of this.vehicles.keys()) {
                DeleteEntity(key);
            }
            
            this.vehicles.clear();

            currentPropertyId = false;
        }
        else notify({description: "Une erreure est survenu", type: 'error'})
    }

    forcePropertyExit(): void {
        SetEntityCoords(PlayerPedId(), this.location.x, this.location.y, this.location.z, true, true, true, false);

        exports.ox_target.removeZone(`property-inside-${this.id}`);

        if (this.vehicles !== undefined) {
            for (const key of this.vehicles.keys()) {
                DeleteEntity(key);
            }
            this.vehicles.clear();
        }
        
        currentPropertyId = false;
    }

    async parkVehicle(): Promise<void> {
        const vehicle: number = cache.vehicle || GetVehiclePedIsIn(cache.ped, false);
        const netId: number = NetworkGetNetworkIdFromEntity(vehicle);

        const vehProps: VehicleProperties = lib.getVehicleProperties(vehicle);
        
        const r = await triggerServerCallback<boolean>('properties:storeVehicle', null, this.id, netId, vehProps);

        if (!r) return;

        await this.enterProperty();
    }

    async loadFurniture(): Promise<void> {
        if (!this.interiorData?.ipl) return;
        const { entrance } = interiors[this.interiorData.ipl.name];
        const origin: Vector3 = new Vector3(entrance.x, entrance.y, entrance.z);
        this.furniture.forEach(async (item) => {

            RequestModel(item.model);

            await waitFor(() => (HasModelLoaded(item.model) ? true : undefined), `Unable to load model ${item.model}`, 10000);
            const entity: number = CreateObject(
                item.model,
                origin.x + item.offset.x, origin.y + item.offset.y, origin.z + item.offset.z,
                false, true, false
            );
            SetEntityHeading(entity, item.offset?.w || 0);
            FreezeEntityPosition(entity, true);
            item.entity = entity;

            /* 
                Create logic for spawning each element,
                Add targetable if `item.stash` is defined and a string to open the stash.
                -> Will need to be registered server side either before hand or during.
                Keep the returned entityID from the prop and store it back into this.furniture, will be used to delete it afterwards.
            */
        });
    }

    clearFurniture() {
        this.furniture.forEach(item => {
            DeleteObject(item.entity);
            item.entity = undefined;
        });
    }

    ringDoorbell(): void {
        console.log(`You rang the doorbell at property with houseNumber: ${this.houseNumber}.`);
    }

    getFurniture(): Array<any> | null {
        return null;
    }
}
export class PropertyManager {
    private properties: Map<number, Property>;

    constructor() {
        this.properties = new Map<number, Property>();
    }

    loadProperties(properties: ClientPropertyData[]): void {
        this.properties = new Map<number, Property>();
        properties.forEach((propertyData) => {
            const property = new Property(
                propertyData.id,
                propertyData.houseNumber,
                propertyData.address,
                propertyData.location,
                propertyData.type,
                propertyData.owner,
                propertyData.group,
                propertyData.keyholders
            );
            this.properties.set(propertyData.id, property);
        });
        console.log(properties.length, 'properties loaded into PropertyManager.');
    }

    getProperties(): Map<number, Property> {
        return this.properties;
    }

    async addProperty(
        id: number,
        houseNumber: string,
        address: string,
        location: Vector4,
        type: "property" | "garage",
        owner: string | null = null,
        group: string | null = null,
        keyholders?: number[],
    ): Promise<Property> {
        const property = new Property(id, houseNumber, address, location, type, owner, group, keyholders || []);
        this.properties.set(id, property);
        return property;
    }

    getCurrentProperty(): Property | undefined | false {
        if (!currentPropertyId) return false;
        return this.properties.get(currentPropertyId);
    }

    getPropertyById(houseId: number): Property | undefined {
        return this.properties.get(houseId);
    }

    async deleteProperty(houseId: number): Promise<void> {
        const property = this.properties.get(houseId);
        if (property) {
            console.log(`Property with ID ${houseId} deleted.`);
        } else {
            console.log(`Property with ID ${houseId} not found.`);
        }
    }
}