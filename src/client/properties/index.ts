import { triggerServerCallback } from '@overextended/ox_lib/client';
import type { ClientPropertyData } from '@common/propertyClasses';
import { Property, PropertyManager } from './class';
import { DEBUG } from '@common/config';

const propertyManager = new PropertyManager;

onNet('ox:setActiveCharacter', async () => {
    const response = await triggerServerCallback<ClientPropertyData[]>('properties:getProperties', null, null);
    if (!response) return;

    propertyManager.loadProperties(response);
});

on('onResourceStop', async (resource: string) => {
    if (resource !== GetCurrentResourceName()) return;

    const property: Property|false|undefined = propertyManager.getCurrentProperty();

    if (!property) return;

    property.forcePropertyExit();
})

if (DEBUG) setTimeout(async () => {
    const response = await triggerServerCallback<ClientPropertyData[]>('properties:getProperties', null, null);
    if (!response) return;

    propertyManager.loadProperties(response);
}, 1000);