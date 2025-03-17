import { Vector3, Vector4 } from '@nativewrappers/fivem';
import { cache, waitFor } from '@overextended/ox_lib';
import { Ox } from '@overextended/ox_core';

export function LoadFile(path: string) {
  return LoadResourceFile(cache.resource, path);
}

export function LoadJsonFile<T = unknown>(path: string): T {
  return JSON.parse(LoadFile(path)) as T;
}

export function distVector3s(v1: Vector3|Vector4, v2: Vector3|Vector4): number {
  const dx = v2.x - v1.x;
  const dy = v2.y - v1.y;
  const dz = v2.z - v1.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export async function LoadModel(model: number | string) {

  if (typeof model === 'string') model = GetHashKey(model);
            
  RequestModel(model);
  await waitFor(() => (IsModelValid(model) && HasModelLoaded(model) ? true : undefined), `Unable to load model ${model}`, 10000);
}

export function GetVehicleModelString(hash: number): string|undefined {
  const vehicles = Ox.GetVehicleData();

  const modelString: string[] = Object.keys(vehicles).filter(model => GetHashKey(model) === hash);

  return modelString.length > 0 ? modelString[0] : undefined;
}