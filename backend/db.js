import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const path = resolve(process.env.DATABASE_PATH || 'backend/data/app.sqlite');
mkdirSync(dirname(path), { recursive: true });

export const db = new DatabaseSync(path);
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
