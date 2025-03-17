// import { Ox } from '@overextended/ox_core/server';
import './property/index';
import { DEBUG } from '@common/config';

if (DEBUG) {
    RegisterCommand('bucket', (source: string) => {
        if (!source) return console.log('No Source');
        console.log(`You're currently in bucket number: ${GetEntityRoutingBucket(GetPlayerPed(source))}`);
    }, null);
    RegisterCommand('resetbucket', (source: string) => {
        if (!source) return console.log('No Source');
        SetEntityRoutingBucket(GetPlayerPed(source), 0);
        console.log(`You've been reset to bucket 0`);
    }, null);
}

// Just leavin it here in case whatever
// Ox.CreateGroup({
//     name: 'dynasty',
//     label: 'Dynasty 8',
//     grades: [
//         {label: 'Recruit'}, {label: 'Consultant', accountRole: 'viewer'}, {label: 'Comptable', accountRole: 'contributor'}, {label: 'PDG', accountRole: 'manager'}
//     ],
//     type: 'job',
//     hasAccount: true
// });
