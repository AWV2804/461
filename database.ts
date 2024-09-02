import * as sqlite3 from 'sqlite3';

function createConnection(): sqlite3.Database {
    const db = new sqlite3.Database('atharvaisanidiot.db', (err) => {
        if(err) {
            console.error('Could not open database', err);
        } else {
            console.log('Connected to the SQLite database.');
        }
    });
    return db
}

function createTable(db: sqlite3.Database): void {
    db.serialize(() => {
        db.run(`
            CREATE TABLE IF NOT EXISTS package_scores (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                url TEXT NOT NULL UNIQUE,
                information TEXT,
                metrics TEXT
            )
        `, (err) => {
            if (err) {
                console.error('Could not create table', err);
            } else {
                console.log('Table created successfully.');
            }
        });
    });
}

function addEntry(db: sqlite3.Database, url: string, information?: string, metrics?: string): void {
    const sql = `INSERT INTO package_scores (url, information, metrics) VALUES(?, ?, ?)`;

    db.run(sql, [url, information || null, metrics || null], (err) => {
        if(err) {
            console.error('Error inserting into table', err);
        } else {
            console.log('Inserted data into table.')
        }
    });
}

function updateEntry(db: sqlite3.Database, url: string, information?: string, metrics?: string): void {
    const sql = `UPDATE package_scores SET information = COALESCE(?, information), metrics = COALESCE(?, metrics) WHERE url = ?`;

    db.run(sql, [information || null, metrics || null, url], (err) => {
        if(err) {
            console.error('Error updating table', err);
        } else {
            console.log('Updated table.')
        }
    });
}

function closeConnection(db: sqlite3.Database): void {
    db.close((err) => {
        if (err) {
            console.error('Could not close the database connection', err);
        } else {
            console.log('Database connection closed.');
        }
    });
}

function main() {
    const db = createConnection();
    createTable(db);

    addEntry(db, "https://example");
    updateEntry(db, "https://example", "Initial info");
    updateEntry(db, "https://example", undefined, "Initial metrics");

    addEntry(db, "https://example2", "init", "init");

    closeConnection(db);
}

main();