import { promises as fs } from 'node:fs';
import path from 'node:path';

export const LOGS_ROOT = path.join(process.cwd(), process.env.APP_LOG_DIR || 'logs');

export function resolveLogPath(relativeFile) {
  return path.resolve(LOGS_ROOT, relativeFile);
}

export function isInsideLogsRoot(resolvedPath) {
  const relative = path.relative(LOGS_ROOT, resolvedPath);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

export async function ensureLogsRoot() {
  await fs.mkdir(LOGS_ROOT, { recursive: true });
}

export async function listNdjsonFiles(dir = LOGS_ROOT, result = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await listNdjsonFiles(full, result);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.ndjson')) {
      const stat = await fs.stat(full);
      result.push({ file: path.relative(LOGS_ROOT, full), size: stat.size, mtime: stat.mtime.toISOString() });
    }
  }
  return result;
}

export async function tailNdjsonEntries(fullPath, maxLines = 200) {
  const content = await fs.readFile(fullPath, 'utf8');
  const lines = content.split('\n').filter(Boolean).slice(-maxLines);
  return lines.map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      return { _raw: line, _parseError: true };
    }
  });
}

export async function clearLogFile(fullPath) {
  await fs.writeFile(fullPath, '', 'utf8');
}
