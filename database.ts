import Database from 'better-sqlite3';
import fs from 'fs'


export function createConnection(fp: number, loglvl: number): Database.Database {
    const db = new Database('metrics.db');
    db.pragma('journal_mode = WAL');
    return db;
}

export function createTable(db: Database.Database, fp: number, loglvl: number): void {
    db.exec(`
        CREATE TABLE IF NOT EXISTS package_scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            url TEXT NOT NULL UNIQUE,
            information TEXT,
            metrics TEXT
        )
    `);
    if(loglvl == 1 || loglvl == 2)  {
        fs.writeFileSync(fp, `Table created successfully\n`); // console.log('Table created successfully.');
    }
}

export function addEntry(db: Database.Database, url: string, fp: number, loglvl: number, information?: string, metrics?: string): void {
    const stmt = db.prepare(`INSERT INTO package_scores (url, information, metrics) VALUES (?, ?, ?)`);
    stmt.run(url, information || null, metrics || null);
    if(loglvl == 1 || loglvl == 2)  {
        fs.writeFileSync(fp, `Inserted data into table.\n`); 
    }// console.log('Inserted data into table.');
}

export function updateEntry(db: Database.Database, url: string, fp: number, loglvl: number, information?: string, metrics?: string): void {
    const stmt = db.prepare(`UPDATE package_scores SET information = COALESCE(?, information), metrics = COALESCE(?, metrics) WHERE url = ?`);
    stmt.run(information || null, metrics || null, url);
    if(loglvl == 1 || loglvl == 2) {
        fs.writeFileSync(fp, `Updated table.\n`); // console.log('Updated table.');
    }
}

export function closeConnection(db: Database.Database, fp: number, loglvl: number): void {
    db.close();
    if(loglvl == 1 || loglvl == 2) {
        fs.writeFileSync(fp, `Database connection closed.\n`); // console.log('Database connection closed.');
    }
}
