import { Controller } from '../controller';
import * as manager from '../manager';
import * as cm from '../calc_metrics';
import * as url_handler from '../url_handler';
import * as om from '../output_metrics';
import * as database from '../database';
import Database from 'better-sqlite3';
import fs from 'fs';
import { EventEmitter } from 'events';

jest.mock('fs');
jest.mock('../manager');
jest.mock('../calc_metrics');
jest.mock('../url_handler');
jest.mock('../output_metrics');
jest.mock('../database');

// Mock better-sqlite3
jest.mock('better-sqlite3', () => {
    return jest.fn().mockImplementation(() => ({
        prepare: jest.fn(() => ({
            run: jest.fn(),
            get: jest.fn(),
            all: jest.fn(),
        })),
        exec: jest.fn(),
        close: jest.fn(),
    }));
});

describe('Controller', () => {
    let mockManager: manager.Manager;
    let mockMetrics: cm.Metrics;
    let mockOutputMetrics: om.OutputMetrics;
    let mockUrlHandler: url_handler.UrlHandler;
    let mockDb: Database.Database;
    let controller: Controller;
    let fp: number;
    let loglvl: number;

    
    beforeEach(() => {
        fp = 1;
        loglvl = 1;
        mockManager = Object.assign(new manager.Manager(fp, loglvl), EventEmitter.prototype);
        mockMetrics = Object.assign(new cm.Metrics(mockDb, fp, loglvl), EventEmitter.prototype);
        mockOutputMetrics = Object.assign(new om.OutputMetrics(mockDb, 1, fp, loglvl), EventEmitter.prototype);
        mockUrlHandler = Object.assign(new url_handler.UrlHandler(mockDb, fp, loglvl), EventEmitter.prototype);
        mockDb = new Database(':memory:');
        controller = new Controller(mockManager, mockMetrics, mockOutputMetrics, mockUrlHandler, fp, loglvl);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should log and call urlHandler.main on startProcessing event', () => {
        const index = 0;
        mockManager.emit('startProcessing', index);

        expect(fs.writeFileSync).toHaveBeenCalledWith(fp, `Processing link in db at index: ${index}\n`);
        expect(mockUrlHandler.main).toHaveBeenCalledWith(index);
    });

    it('should log and call outputMetrics.output_Metrics on metrics done event', () => {
        const index = 0;
        mockMetrics.emit('done', index);

        expect(fs.writeFileSync).toHaveBeenCalledWith(fp, `Metrics done\n`);
        expect(mockOutputMetrics.output_Metrics).toHaveBeenCalledWith(index);
    });

    it('should log and call metrics.calc on urlHandler done event', () => {
        const index = 0;
        mockUrlHandler.emit('done', index);

        expect(fs.writeFileSync).toHaveBeenCalledWith(fp, `URL handling done\n`);
        expect(mockMetrics.calc).toHaveBeenCalledWith(index);
    });

    it('should log on outputMetrics done event', () => {
        const index = 0;
        mockOutputMetrics.emit('done', index);

        expect(fs.writeFileSync).toHaveBeenCalledWith(fp, `Outputting metrics for url at index: ${index}\n`);
    });

    it('should close database connection and file on outputMetrics close event', () => {
        mockOutputMetrics.emit('close', mockDb);

        expect(database.closeConnection).toHaveBeenCalledWith(mockDb, fp, loglvl);
        expect(fs.closeSync).toHaveBeenCalledWith(fp);
    });
});
