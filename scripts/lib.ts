// Helpers shared by the data-building scripts.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const CACHE = join(ROOT, 'scripts', '.cache');
export const OUT = join(ROOT, 'src', 'data');

/** Downloads a file once and keeps it in scripts/.cache, so reruns work offline. */
export async function download(name: string, url: string): Promise<Buffer> {
  const file = join(CACHE, name);
  if (existsSync(file)) return readFileSync(file);
  console.log(`Downloading ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed (${res.status}): ${url}`);
  const data = Buffer.from(await res.arrayBuffer());
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(file, data);
  return data;
}

export function toLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
}
