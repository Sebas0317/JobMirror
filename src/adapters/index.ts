import { BaseAdapter } from './BaseAdapter.ts';
import { ComputrabajoAdapter } from './computrabajo.ts';
import { ElempleoAdapter } from './elempleo.ts';
import { MagnetoAdapter } from './magneto.ts';
import type { AdapterInfo } from './types.ts';

const adapters: BaseAdapter[] = [
  new ComputrabajoAdapter(),
  new ElempleoAdapter(),
  new MagnetoAdapter(),
];

const adapterMap = new Map<string, BaseAdapter>();
for (const a of adapters) {
  adapterMap.set(a.name, a);
}

export function getAdapter(name: string): BaseAdapter | undefined {
  return adapterMap.get(name);
}

export function getAllAdapters(): BaseAdapter[] {
  return adapters;
}

export function getAdapterInfos(): AdapterInfo[] {
  return adapters.map(a => a.info);
}
