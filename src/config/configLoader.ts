import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * Utility to load JSON configuration files from the `config` folder.
 * Returns a typed object (or throws if the file cannot be read / parsed).
 */
export async function loadConfig<T>(fileName: string): Promise<T> {
  const filePath = join(process.cwd(), 'config', fileName);
  const raw = await readFile(filePath, { encoding: 'utf-8' });
  return JSON.parse(raw) as T;
}

/** Types for the two configuration files */
export interface SourceConfig {
  enabled: boolean;
  city?: string;
  keywords?: string[];
  pages?: number;
  [key: string]: unknown;
}

export interface Sources {
  [key: string]: SourceConfig;
}

/** Helper wrapper to load the source configs */
export async function loadSources(): Promise<Record<string, any>> {
  return loadConfig<Record<string, any>>('sources.json');
}