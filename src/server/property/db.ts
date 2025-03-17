import { oxmysql as MySQL } from '@overextended/oxmysql';
import { Vector4 } from '@nativewrappers/fivem';
import { Property, PropertyManager, PropertyStatus } from './class';
import { InteriorReference, keyholder } from 'propertyClasses';
import { VehicleData } from '@common/garageTypes';

export async function loadPropertiesIntoManager(manager: PropertyManager): Promise<void> {
    const query = 'SELECT * FROM Properties';
    const response = await MySQL.query(query);

    if (response) {
        const properties = await Promise.all(response.map(async (row: any) => {
            const location = new Vector4(row.location_x, row.location_y, row.location_z, row.location_w);

            const interior: InteriorReference = {
                type: row.interior_type,
                ipl: row.interior_ipl_name
                    ? { name: row.interior_ipl_name, colorref: row.interior_ipl_colorref }
                    : undefined,
                shell: row.interior_shell_model
                    ? {
                        model: row.interior_shell_model,
                        position: new Vector4(row.interior_shell_position_x, row.interior_shell_position_y, row.interior_shell_position_z, row.interior_shell_position_w)
                    }
                    : undefined,
            };

            const keyholders = await getKeyholders(row.id);

            return new Property(
                row.id,
                row.id.toString(),
                row.address,
                row.status as PropertyStatus,
                location,
                interior,
                JSON.parse(row.furniture) || null,
                row.owner,
                row.group,
                keyholders,
                row.expiryDate ? new Date(row.expiryDate) : undefined
            );
        }));

        manager.loadProperties(properties);
    }
}

export async function addNewProperty(property: Property): Promise<number> {
    const query = `
        INSERT INTO Properties (
            address, 
            status, 
            expiryDate, 
            location_x, location_y, location_z, location_w, 
            interior_type, 
            interior_ipl_name, interior_ipl_colorref, 
            interior_shell_model, 
            interior_shell_position_x, interior_shell_position_y, interior_shell_position_z, interior_shell_position_w, 
            furniture, 
            owner, 
            \`group\`
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
        property.address,
        property.status,
        property.expiryDate ? property.expiryDate.toISOString().slice(0, 19).replace('T', ' ') : null,
        property.location.x,
        property.location.y,
        property.location.z,
        property.location.w,
        property.interior.type,
        property.interior.ipl?.name || null,
        property.interior.ipl?.colorref || null,
        property.interior.shell?.model || null,
        property.interior.shell?.position.x || null,
        property.interior.shell?.position.y || null,
        property.interior.shell?.position.z || null,
        property.interior.shell?.position.w || null,
        JSON.stringify(property.furniture),
        property.owner,
        property.group
    ];

    return new Promise((resolve, reject) => {
        MySQL.insert(query, params, (id: any) => {
            resolve(id);
        });
    });
}

export function saveProperty(id: number, property: Property): void {
    const query = `
        UPDATE Properties 
        SET 
            address = ?, 
            status = ?, 
            expiryDate = ?, 
            location_x = ?, location_y = ?, location_z = ?, location_w = ?, 
            interior_type = ?, 
            interior_ipl_name = ?, interior_ipl_colorref = ?, 
            interior_shell_model = ?, 
            interior_shell_position_x = ?, interior_shell_position_y = ?, interior_shell_position_z = ?, interior_shell_position_w = ?, 
            furniture = ?, 
            owner = ?, 
            \`group\` = ?
        WHERE id = ?
    `;
    
    const params = [
        property.address,
        property.status,
        property.expiryDate ? property.expiryDate.toISOString().slice(0, 19).replace('T', ' ') : null,
        property.location.x,
        property.location.y,
        property.location.z,
        property.location.w,
        property.interior.type,
        property.interior.ipl?.name || null,
        property.interior.ipl?.colorref || null,
        property.interior.shell?.model || null,
        property.interior.shell?.position.x || null,
        property.interior.shell?.position.y || null,
        property.interior.shell?.position.z || null,
        property.interior.shell?.position.w || null,
        JSON.stringify(property.furniture),
        property.owner,
        property.group,
        id
    ];
    

    MySQL.update(query, params, (affectedRows: number) => {
        if (affectedRows === 1) {
            console.error('Unable to save property ID:', property.id);
        }
    });

}

export function deleteProperty(id: number): void {
    MySQL.update("DELETE FROM properties WHERE id = ?", [id], (affectedRows: number) => {
        if (affectedRows !== 1) {
            console.error('Unable to delete property ID:', id);
        }
    });
    MySQL.update("DELETE FROM properties_keyholders WHERE propertyId = ?", [id], (affectedRows: number) => {});
}

export async function getKeyholders(propertyId: number): Promise<Map<number, keyholder>> {
    const response = await MySQL.query('SELECT * FROM properties_keyholders WHERE propertyId = ?', [propertyId]);
    const keyholdersMap = new Map<number, keyholder>();

    response.forEach((e: {[key: string]: number}) => {
        keyholdersMap.set(e.charId, {
            canFurnish: e.canFurnish === 1,
            canFinance: e.canFinance === 1,
            canGrantAccess: e.canGrantAccess === 1,
        });
    });

    return keyholdersMap;
}

export async function getParkedVehicles(propertyId: number): Promise<VehicleData[]> {
    const rawResponse = await MySQL.query('SELECT * FROM `vehicles` WHERE `stored` = ?', [`garage_${propertyId}`]);
    
    return rawResponse.map((entry: any) => ({
        ...entry,
        data: JSON.parse(entry.data),
        owner: undefined, group: undefined,
    }));
}