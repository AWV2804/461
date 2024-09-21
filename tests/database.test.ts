import { createConnection, createTable, addEntry, updateEntry, closeConnection } from '../database';
import fs from 'fs';
import Database from 'better-sqlite3';

jest.mock('fs');
jest.mock('better-sqlite3', () => {
    return jest.fn(() => ({
        pragma: jest.fn(),
        exec: jest.fn(),
        prepare: jest.fn(() => ({
            run: jest.fn(),
            get: jest.fn(() => ({ url: 'http://example.com', information: 'Example information', metrics: 'Example metrics' })),
        })),
        close: jest.fn(),
    }));
});

describe('Database functions', () => {
    let db: Database.Database;
    const logfile = '/tmp/test_logfile.log';
    const fp = fs.openSync(logfile, 'w');
    const loglvl = 1;

    beforeAll(() => {
        db = createConnection(fp, loglvl);
    });

    afterAll(() => {
        closeConnection(db, fp, loglvl);
    });

    test('createConnection should create a database connection', () => {
        //expect(db).toBeInstanceOf(Database);
        expect(db.pragma).toHaveBeenCalledWith('journal_mode = WAL');
    });

    test('createTable should create a table', () => {
        createTable(db, fp, loglvl);
        expect(db.exec).toHaveBeenCalled();
        expect(fs.writeFileSync).toHaveBeenCalledWith(fp, 'Table created successfully\n');
    });

    test('addEntry should insert data into the table', () => {
        const url = 'http://example.com';
        const information = 'Example information';
        const metrics = 'Example metrics';
        addEntry(db, url, fp, loglvl, information, metrics);
        expect(db.prepare).toHaveBeenCalledWith('INSERT INTO package_scores (url, information, metrics) VALUES (?, ?, ?)');
        expect(fs.writeFileSync).toHaveBeenCalledWith(fp, 'Inserted data into table.\n');
    });

    test('updateEntry should update data in the table', () => {
        const url = 'http://example.com';
        const newInformation = 'Updated information';
        const newMetrics = 'Updated metrics';
        updateEntry(db, url, fp, loglvl, newInformation, newMetrics);
        expect(db.prepare).toHaveBeenCalledWith('UPDATE package_scores SET information = COALESCE(?, information), metrics = COALESCE(?, metrics) WHERE url = ?');
        expect(fs.writeFileSync).toHaveBeenCalledWith(fp, 'Updated table.\n');
    });

    test('closeConnection should close the database connection', () => {
        closeConnection(db, fp, loglvl);
        expect(db.close).toHaveBeenCalled();
        expect(fs.writeFileSync).toHaveBeenCalledWith(fp, 'Database connection closed.\n');
    });
});
