import { onClientCallback, sleep, VehicleProperties, waitFor } from '@overextended/ox_lib/server'
import { IProperty, PropertyManager } from './class';
import { loadPropertiesIntoManager } from './db';
import { Ox } from '@overextended/ox_core';
import { Vector3 } from '@nativewrappers/fivem';
import { distVector3s } from 'utils';
import { Furniture, InteriorReference } from 'propertyClasses';
import { VehicleData } from 'garageTypes';
import { GetVehicleFromNetId, OxVehicle, SpawnVehicle } from '@overextended/ox_core/server';

const propertyManager = new PropertyManager();

loadPropertiesIntoManager(propertyManager).then(() => {}).catch((err: any) => console.error('Failed to load properties:', err.message));

on('onResourceStop', (resource: string) => {
    if (resource !== GetCurrentResourceName()) return;

    propertyManager.saveAll();
});

onClientCallback('properties:getProperties', (playerId) => {
    return propertyManager.getProperties();
});

/* 
    1       - Rings Doorbell
    2       - Enters the property
    false   - Entry isn't possible
 */
onClientCallback('properties:enterPropertyPhase1', (playerSrc: number, propertyId: number): InteriorReference|1|false => {
    const property = propertyManager.getPropertyById(propertyId);

    const player = Ox.GetPlayer(playerSrc);
    const [x, y, z] = GetEntityCoords(player.ped);

    const distance = distVector3s(new Vector3(x, y, z), property.location);

    if (distance > 4) {
        console.log('Too far away', playerSrc, 'from houseNumber', property.houseNumber, 'distance:', distance);
        return false;
    }

    if (property.owner && property.owner === player.charId) return property.interior;
    if (property.group && player.getGroup(property.group)) return property.interior;
    if (property.keyholders.get(player.charId)) return property.interior;

    return property.ringDoorbell(playerSrc);
});

onClientCallback('properties:enterPropertyPhase2', async (playerSrc: number, propertyId: number): Promise<[boolean, Furniture[], VehicleData[]]> => {
    const property = propertyManager.getPropertyById(propertyId);

    return await property.enterPlayer(playerSrc);
});

onClientCallback('properties:leaveProperty', (playerSrc: number, propertyId: number): boolean => {
    const property = propertyManager.getPropertyById(propertyId);

    property.exitPlayer(playerSrc);

    return true;
});

onClientCallback('properties:storeVehicle', (playerSrc: number, houseNumber: number, vehNetId: number, vehProps: VehicleProperties): boolean => {

    const property: IProperty = propertyManager.getPropertyById(houseNumber);

    const player = GetPlayerPed(playerSrc.toString());
    const [x, y, z] = GetEntityCoords(player);

    const distance = distVector3s(new Vector3(x, y, z), property.location);

    if (distance > 4) {
        console.log('Too far away', playerSrc, 'from houseNumber', property.houseNumber, 'distance:', distance);
        return false;
    }

    let vehicle: OxVehicle = GetVehicleFromNetId(vehNetId);

    if (!vehicle) {

        /*  Possibility to review at a later date
            This would need some changes as the vehicle doesn't exist in ox_core nor in the DB
            Either Deny parking stolen vehicles, or try finding an alternative.
         */

        // const model: string = GetVehicleModelString(Number(vehProps.model));
        // if (!model) {
        //     console.log(`Unable to find string model for hash ${vehProps.model} for player ${playerSrc} parking it in ${houseNumber}`);
        //     return false;
        // }
        // console.log('Creating vehicle');
        // CreateVehicle({
        //     model: model,
        //     stored: `garage_${houseNumber}`,
        //     properties: vehProps
        // })

        // DeleteEntity(NetworkGetEntityFromNetworkId(vehNetId));

        /* For now just refuse parking of it */
        emitNet('ox_lib:notify', playerSrc, {title: 'Impossible', description: 'Ce véhicule ne t\'appartiens pas.', type: 'error'});

    } else {
        vehicle.setProperties(vehProps);
        vehicle.setStored(`garage_${houseNumber}`, true);
    }

    return true;
});

onNet('properties:leaveGarageWithVehicle', async (houseId: number, vehicleId: number) => {
    const playerSrc = source;
    const property = propertyManager.getPropertyById(houseId);

    if (property.inside.indexOf(playerSrc) === -1) return console.log(`${playerSrc} tried to exploit ^1properties:leaveGarageWithVehicle^7 !`);

    const { location } = property;
    const { x, y, z } = location;

    const vehicle: OxVehicle = await SpawnVehicle(vehicleId, {x, y, z}, location.w);

    if (!vehicle) return emitNet('ox_lib:notify', playerSrc, {title: 'Impossible', description: 'Le véhicule n\'as pas pu être sorti.', type: 'error'});
    
    const ped: number = GetPlayerPed(playerSrc.toString());

    await sleep(500);
    await waitFor(() => (GetPlayerRoutingBucket(playerSrc.toString()) === 0), '', 1000);

    console.log(`Setting player (${playerSrc}) into vehicle`);
    SetPedIntoVehicle(ped, vehicle.entity, -1);
});