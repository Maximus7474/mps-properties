import type StaticConfig from '~/static/config.json';
import { LoadJsonFile } from 'utils';

export default LoadJsonFile<typeof StaticConfig>('static/config.json');

export const DEBUG = (() => {
    DEV: return true;
    //@ts-ignore
    return GetConvarInt('ox:debug', 0) === 1;
})();