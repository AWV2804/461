import Database from 'better-sqlite3';
import fs from 'fs'

/**
* Functions to interact with SQLite3 Database
*/
export function createConnection(fp: number, loglvl: number): Database.Database {
    /**
     * Function to create a connection to the database to read and write to it.
     * Will create a new metrics.db file if it doesn't exist
     * 
     * Inputs: 
     * - fp: number - logfile pointer if logging wanted to be added
     * - loglvl: number - log level set by user for specific level of logging wanted
     * 
     * Outputs:
     * - Database.Database - better-sqlite3 type for connection to database
     */
    const db = new Database('metrics.db');
    db.pragma('journal_mode = WAL');
    return db;
}

export function createTable(db: Database.Database, fp: number, loglvl: number): void {
    /**
     * Function to create a table in the database if it doesn't exist. 
     * The table has an id for row number, a unique url that is going to be scored, information for collected info from Github API and other avenues, and then the calculated metrics
     * 
     * Inputs:
     * - db: Database.Database - Database connection to write in the database
     * - fp: number - logfile pointer if logging wanted to be added
     * - loglvl: number - log level set by user for specific level of logging wanted
     * 
     * Outputs:
     * - None
     */
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
    /**
     * Function to add an entry into the table
     * Information and Metrics are not required as they are calculated in their specific classes and then updated based on url
     * 
     * Inputs:
     * - db: Database.Database - Database connection to write in the database
     * - url: string - URL that will be scored
     * - fp: number - logfile pointer if logging wanted to be added
     * - loglvl: number - log level set by user for specific level of logging wanted
     * - information?: string - optional information to be added to the row. If not provided, null will be entered as the data in order for the table to allow it to be updated
     * - metrics?: string - optional calculated metrics to be added to the row. If not provided, null will be entered as the data in order for the table to allow it to be updated
     * 
     * Outputs:
     * - None
     */
    const stmt = db.prepare(`INSERT INTO package_scores (url, information, metrics) VALUES (?, ?, ?)`);
    stmt.run(url, information || null, metrics || null);
    if(loglvl == 1 || loglvl == 2)  {
        fs.writeFileSync(fp, `Inserted data into table.\n`); 
    }// console.log('Inserted data into table.');
}

export function updateEntry(db: Database.Database, url: string, fp: number, loglvl: number, information?: string, metrics?: string): void {
    /**
     * Function to update an entry in the table based on the url
     * Information and Metrics are not required as they are updated based on whichever class is updating them
     * 
     * Inputs:
     * - db: Database.Database - Database connection to write in the database
     * - url: string - URL that will be scored
     * - fp: number - logfile pointer if logging wanted to be added
     * - loglvl: number - log level set by user for specific level of logging wanted
     * - information?: string - optional information to be added to the row. If not provided, null will be entered as the data in order for the table to allow it to be updated
     * - metrics?: string - optional calculated metrics to be added to the row. If not provided, null will be entered as the data in order for the table to allow it to be updated
     * 
     * Outputs:
     * - None
     */
    const stmt = db.prepare(`UPDATE package_scores SET information = COALESCE(?, information), metrics = COALESCE(?, metrics) WHERE url = ?`);
    stmt.run(information || null, metrics || null, url);
    if(loglvl == 1 || loglvl == 2) {
        fs.writeFileSync(fp, `Updated table.\n`); // console.log('Updated table.');
    }
}

export function closeConnection(db: Database.Database, fp: number, loglvl: number): void {
    /**
     * Function to close connection to database properly
     * 
     * Inputs:
     * - db: Database.Database - Database connection to write in the database
     * - fp: number - logfile pointer if logging wanted to be added
     * - loglvl: number - log level set by user for specific level of logging wanted
     * 
     * Outputs:
     * - None
     */
    db.close();
    if(loglvl == 1 || loglvl == 2) {
        fs.writeFileSync(fp, `Database connection closed.\n`); // console.log('Database connection closed.');
    }
}
