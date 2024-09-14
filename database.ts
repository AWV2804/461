import Database from 'better-sqlite3';



export function createConnection(): Database.Database {
    const db = new Database('metrics.db');
    db.pragma('journal_mode = WAL');
    return db;
}

export function createTable(db: Database.Database): void {
    db.exec(`
        CREATE TABLE IF NOT EXISTS package_scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            url TEXT NOT NULL UNIQUE,
            information TEXT,
            metrics TEXT
        )
    `);
    console.log('Table created successfully.');
}

export function addEntry(db: Database.Database, url: string, information?: string, metrics?: string): void {
    const stmt = db.prepare(`INSERT INTO package_scores (url, information, metrics) VALUES (?, ?, ?)`);
    stmt.run(url, information || null, metrics || null);
    console.log('Inserted data into table.');
}

export function updateEntry(db: Database.Database, url: string, information?: string, metrics?: string): void {
    const stmt = db.prepare(`UPDATE package_scores SET information = COALESCE(?, information), metrics = COALESCE(?, metrics) WHERE url = ?`);
    stmt.run(information || null, metrics || null, url);
    console.log('Updated table.');
}

export function closeConnection(db: Database.Database): void {
    db.close();
    console.log('Database connection closed.');
}

// export function createTable(db: Database.Database): void {
//     db.serialize(() => {
//         db.run(`
//             CREATE TABLE IF NOT EXISTS package_scores (
//                 id INTEGER PRIMARY KEY AUTOINCREMENT,
//                 url TEXT NOT NULL UNIQUE,
//                 information TEXT,
//                 metrics TEXT
//             )
//         `, (err) => {
//             if (err) {
//                 console.error('Could not create table', err);
//             } else {
//                 console.log('Table created successfully.');
//             }
//         });
//     });
// }

// export function addEntry(db: sqlite3.Database, url: string, information?: string, metrics?: string): void {
//     const sql = `INSERT INTO package_scores (url, information, metrics) VALUES(?, ?, ?)`;

//     db.run(sql, [url, information || null, metrics || null], (err) => {
//         if(err) {
//             console.error('Error inserting into table', err);
//         } else {
//             console.log('Inserted data into table.')
//         }
//     });
// }

// export function updateEntry(db: sqlite3.Database, url: string, information?: string, metrics?: string): void {
//     const sql = `UPDATE package_scores SET information = COALESCE(?, information), metrics = COALESCE(?, metrics) WHERE url = ?`;

//     db.run(sql, [information || null, metrics || null, url], (err) => {
//         if(err) {
//             console.error('Error updating table', err);
//         } else {
//             console.log('Updated table.')
//         }
//     });
// }

// export function closeConnection(db: sqlite3.Database): void {
//     db.close((err) => {
//         if (err) {
//             console.error('Could not close the database connection', err);
//         } else {
//             console.log('Database connection closed.');
//         }
//     });
// }

// function main() {
//     const db = createConnection();
//     createTable(db);

//     addEntry(db, "https://example");
//     updateEntry(db, "https://example", "Initial info");
//     updateEntry(db, "https://example", undefined, "Initial metrics");

//     addEntry(db, "https://example2", "init", "init");

    
//     // test(db, `SELECT * FROM package_scores;`);
//     closeConnection(db);
// }

// main();