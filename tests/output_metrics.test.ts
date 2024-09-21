import { OutputMetrics } from '../output_metrics';
import Database from 'better-sqlite3';
import { EventEmitter } from 'stream';

jest.mock('better-sqlite3', () => {
    return jest.fn().mockImplementation(() => {
        return {
            prepare: jest.fn().mockReturnValue({
                all: jest.fn()
            })
        };
    });
});

describe('OutputMetrics', () => {
    let db: Database.Database;
    let outputMetrics: OutputMetrics;

    beforeEach(() => {
        db = new Database(':memory:');
        outputMetrics = new OutputMetrics(db, 1, 0, 0);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should output metrics correctly when data is found', () => {
        const mockRows = [
            {
                url: 'http://example.com',
                metrics: JSON.stringify({
                    BusFactor_Latency: 1.23456,
                    Correctness_Latency: 2.34567,
                    RampUp_Latency: 3.45678,
                    ResponsiveMaintainer_Latency: 4.56789,
                    License_Latency: 5.67890,
                    NetScore_Latency: 6.78901,
                    BusFactor: 7.89012,
                    Correctness: 8.90123,
                    RampUp: 9.01234,
                    ResponsiveMaintainer: 0.12345,
                    NetScore: 1.23456
                })
            }
        ];

        (db.prepare as jest.Mock).mockReturnValue({
            all: jest.fn().mockReturnValue(mockRows)
        });

        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        outputMetrics.output_Metrics(1);

        expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify({
            URL: 'http://example.com',
            BusFactor_Latency: '1.235',
            Correctness_Latency: '2.346',
            RampUp_Latency: '3.457',
            ResponsiveMaintainer_Latency: '4.568',
            License_Latency: '5.679',
            NetScore_Latency: '6.789',
            BusFactor: '7.890',
            Correctness: '8.901',
            RampUp: '9.012',
            ResponsiveMaintainer: '0.123',
            NetScore: '1.235'
        }));

        consoleSpy.mockRestore();
    });

    it('should log "No data found in the database." when no data is found', () => {
        (db.prepare as jest.Mock).mockReturnValue({
            all: jest.fn().mockReturnValue([])
        });

        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        outputMetrics.output_Metrics(1);

        expect(consoleSpy).toHaveBeenCalledWith('No data found in the database.');

        consoleSpy.mockRestore();
    });

    it('should emit "done" event after processing', (done) => {
        (db.prepare as jest.Mock).mockReturnValue({
            all: jest.fn().mockReturnValue([])
        });

        outputMetrics.on('done', (index) => {
            expect(index).toBe(1);
            done();
        });

        outputMetrics.output_Metrics(1);
    });

    it('should emit "close" event when fileNum reaches 0', (done) => {
        (db.prepare as jest.Mock).mockReturnValue({
            all: jest.fn().mockReturnValue([])
        });
        outputMetrics = new OutputMetrics(db, 1, 0, 0);

        outputMetrics.on('close', (dbInstance) => {
            expect(dbInstance).toBe(db);
            done();
        });

        outputMetrics.output_Metrics(1);
    });

    it('should handle errors and exit process', () => {
        const mockExit = jest.spyOn(process, 'exit').mockImplementation((code?: number) => {
            throw new Error(`process.exit: ${code}`);
        });

        (db.prepare as jest.Mock).mockReturnValue({
            all: jest.fn().mockImplementation(() => {
                throw new Error('Database error');
            })
        });

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        expect(() => outputMetrics.output_Metrics(1)).toThrow('process.exit: 1');
        expect(consoleSpy).toHaveBeenCalledWith('Error retrieving data from the database:', expect.any(Error));

        consoleSpy.mockRestore();
        mockExit.mockRestore();
    });
});