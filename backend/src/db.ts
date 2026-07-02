import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.resolve(__dirname, '..', 'database.sqlite');

let db: Database;

/** Salvar o banco de dados em disco */
function saveToDisk(): void {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

/** Inicializar o banco de dados (deve ser chamado com await na inicialização) */
export async function initDatabase(): Promise<void> {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
    console.log('[DB] Database loaded from', DB_PATH);
  } else {
    db = new SQL.Database();
    console.log('[DB] New database created');
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS computers (
      username    TEXT PRIMARY KEY COLLATE NOCASE,
      password    TEXT NOT NULL,
      created_at  TEXT DEFAULT (datetime('now')),
      last_seen   TEXT DEFAULT (datetime('now'))
    );
  `);

  saveToDisk();
  console.log('[DB] Database initialized at', DB_PATH);
}

export interface ComputerRow {
  username: string;
  password: string;
  created_at: string;
  last_seen: string;
}

/** Busca um computador pelo username (case-insensitive) */
export function getComputer(username: string): ComputerRow | undefined {
  const stmt = db.prepare('SELECT * FROM computers WHERE username = ? COLLATE NOCASE');
  stmt.bind([username]);

  if (stmt.step()) {
    const row = stmt.getAsObject() as unknown as ComputerRow;
    stmt.free();
    return row;
  }
  stmt.free();
  return undefined;
}

/** Cria um novo registro de computador */
export function createComputer(username: string, password: string): void {
  db.run('INSERT INTO computers (username, password) VALUES (?, ?)', [username, password]);
  saveToDisk();
}

/** Atualiza o last_seen de um computador */
export function touchComputer(username: string): void {
  db.run("UPDATE computers SET last_seen = datetime('now') WHERE username = ? COLLATE NOCASE", [username]);
  saveToDisk();
}

/** Atualiza a senha de um computador existente */
export function updateComputerPassword(username: string, newPassword: string): void {
  db.run('UPDATE computers SET password = ? WHERE username = ? COLLATE NOCASE', [newPassword, username]);
  saveToDisk();
}
