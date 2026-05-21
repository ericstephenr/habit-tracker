import { version as APP_VERSION } from '../../package.json';
import { migrate } from './storage';
import { todayISO } from './schedule';
import type { AppData } from './types';

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export type ExportEnvelope = {
  exportedAt: string;
  appVersion: string;
  data: AppData;
};

export type ImportMeta = {
  exportedAt: string | null;
  appVersion: string | null;
};

export type ImportResult =
  | { ok: true; data: AppData; meta: ImportMeta }
  | { ok: false; error: string };

export function buildExportPayload(data: AppData): ExportEnvelope {
  return {
    exportedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    data
  };
}

export function exportFilename(): string {
  return `habit-tracker-export-${todayISO()}.json`;
}

export function downloadJson(filename: string, payload: unknown): void {
  const text = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function readFile(file: File): Promise<string> {
  if (file.size > MAX_IMPORT_BYTES) {
    throw new Error("File is too large. This doesn't look like a habit-tracker export.");
  }
  try {
    return await file.text();
  } catch {
    throw new Error("Couldn't read the file. Try again.");
  }
}

function isPlainObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

export function parseImportText(raw: string): ImportResult {
  if (raw.length === 0) {
    return { ok: false, error: 'The selected file is empty.' };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "That file isn't valid JSON." };
  }
  if (!isPlainObject(parsed)) {
    return {
      ok: false,
      error: 'Unexpected file shape — expected an exported habit-tracker JSON file.'
    };
  }

  // Accept either the wrapped envelope or a bare AppData object. A bare AppData
  // has a top-level numeric `version`; an envelope wraps it inside `data`.
  let unwrapped: unknown;
  let meta: ImportMeta = { exportedAt: null, appVersion: null };
  if (typeof parsed.version === 'number') {
    unwrapped = parsed;
  } else if (isPlainObject(parsed.data)) {
    unwrapped = parsed.data;
    meta = {
      exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : null,
      appVersion: typeof parsed.appVersion === 'string' ? parsed.appVersion : null
    };
  } else {
    return { ok: false, error: 'This file is missing habit data.' };
  }

  const data = migrate(unwrapped);
  if (!data) {
    return { ok: false, error: "This file isn't a valid habit-tracker export." };
  }
  return { ok: true, data, meta };
}
