import { Metrics } from '../calc_metrics'; // Adjust the path accordingly
import { updateEntry } from '../database'; // Adjust the path as needed
import Database from 'better-sqlite3';
import { EventEmitter } from 'events';
import * as fs from 'fs';

// Mock the database and filesystem modules
jest.mock('better-sqlite3');
jest.mock('fs');
jest.mock('performance-now', () => jest.fn(() => 100)); // Mock now() to always return 100

// Mock the database
const mockDatabase = {
  prepare: jest.fn().mockReturnValue({
    all: jest.fn(),
  }),
  run: jest.fn(),
};

// Mock the file system functions using spyOn
jest.spyOn(fs, 'writeFileSync').mockImplementation(jest.fn());

describe('Metrics Class Tests', () => {
  let metrics: Metrics;
  let db: Database.Database;
  let mockExit: jest.SpyInstance;

  beforeEach(() => {
    db = mockDatabase as unknown as Database.Database;
    metrics = new Metrics(db, 1, 1);

    // Mock process.exit
    mockExit = jest.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`process.exit called with code ${code}`);
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should initialize the Metrics instance correctly', () => {
    expect(metrics).toBeInstanceOf(EventEmitter);
    expect(metrics['done']).toBe(false);
    expect(metrics['fp']).toBe(1);
    expect(metrics['loglvl']).toBe(1);
  });

  test('should parse the row data correctly in _calc_callback()', () => {
    const row = {
      id: 1,
      url: 'https://example.com',
      information: '{"top3": 10, "commits/yr": 100, "downloads": 500000}',
      metrics: null,
    };

    (metrics as any)._calc_callback(row); // Use 'any' to bypass access to the private method

    const parsedMap = new Map([
      ['top3', 10],
      ['commits/yr', 100],
      ['downloads', 500000],
    ]);

    expect(metrics['_info'].get('https://example.com')).toEqual(parsedMap);
  });

  test('should calculate the bus factor correctly in _busFactor()', () => {
    const packageInfo = new Map<string, number>([
      ['top3', 10],
      ['commits/yr', 100],
    ]);

    const metricsMap = new Map<string, number>();
    const busFactor = (metrics as any)._busFactor(packageInfo, metricsMap);

    expect(busFactor).toBe(0.9); // 1 - (10 / 100)
    expect(metricsMap.get('BusFactor')).toBe(0.9);
  });

  test('should calculate net score correctly', () => {
    const bus = 0.9;
    const correctness = 0.8;
    const rampUp = 0.7;
    const responsiveness = 1.0;
    const license = 1.0;

    const netScore = (metrics as any)._netScore(bus, correctness, rampUp, responsiveness, license);
    expect(netScore).toBe(0.87); // Check your expected weighted average formula
  });

  test('should handle database errors and log errors correctly in _calc_callback()', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const faultyRow = {
      id: 1,
      url: 'https://example.com',
      information: '{invalid json}', // Bad JSON data
      metrics: null,
    };

    expect(() => (metrics as any)._calc_callback(faultyRow as any)).toThrow('process.exit called with code 1');
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Error parsing information'));
  });

  test('should calculate responsiveness correctly', () => {
    const packageInfo = new Map<string, number>([
      ['iss3', 5],
      ['iss7', 3],
      ['iss14', 1],
      ['iss31', 2],
      ['issuesOpenedYr', 10],
    ]);
  
    const metricsMap = new Map<string, number>();
    const responsiveness = (metrics as any)._responsiveness(packageInfo, metricsMap);
  
    expect(responsiveness).toBe(0.77); // (5 + 3 * 0.7 + 1 * 0.4 + 2 * 0.1) / 10
    expect(metricsMap.get('ResponsiveMaintainer')).toBe(0.77);
  });
  
  test('should calculate ramp-up correctly', () => {
    const packageInfo = new Map<string, number>([
      ['downloads', 600000],
    ]);
  
    const metricsMap = new Map<string, number>();
    const rampUp = (metrics as any)._rampUp(packageInfo, metricsMap);
  
    expect(rampUp).toBe(0.9); // 500k-1.2M downloads results in 0.6 score
    expect(metricsMap.get('RampUp')).toBe(0.9);
  });
    
  test('should calculate correctness correctly', () => {
    const packageInfo = new Map<string, number>([
      ['issuesClosedYr', 5],
      ['issuesOpenedYr', 10],
    ]);
  
    const metricsMap = new Map<string, number>();
    const correctness = (metrics as any)._correctness(packageInfo, metricsMap);
  
    expect(correctness).toBe(0.5); // 5 resolved issues out of 10 total
    expect(metricsMap.get('Correctness')).toBe(0.5);
  });
  
  test('should handle missing data gracefully in _busFactor()', () => {
    const packageInfo = new Map<string, number>([
      // Missing 'commits/yr'
      ['top3', 10],
    ]);
  
    const metricsMap = new Map<string, number>();
    expect(() => (metrics as any)._busFactor(packageInfo, metricsMap)).toThrow('process.exit called with code 1');
  });
  
  test('should handle missing data gracefully in _rampUp()', () => {
    const packageInfo = new Map<string, number>(); // No 'downloads' key
  
    const metricsMap = new Map<string, number>();
    expect(() => (metrics as any)._rampUp(packageInfo, metricsMap)).toThrow('process.exit called with code 1');
  });
    
  test('should calculate and store metrics correctly in _calculateMetrics()', () => {
    const parsedMap = new Map([
      ['top3', 10],
      ['commits/yr', 100],
      ['downloads', 600000],
      ['iss3', 5],
      ['iss7', 3],
      ['iss14', 1],
      ['iss31', 2],
      ['issuesOpenedYr', 10],  // Ensure this is correct
      ['License', 1],
    ]);
    
    // Log to debug what is being set in _info
    console.log('Mocked parsedMap:', parsedMap);

    metrics['_info'].set('https://example.com', parsedMap);

    // Spy directly on updateEntry function
    const dbUpdateSpy = jest.spyOn(database, 'updateEntry').mockImplementation(() => {
      // Mock implementation for the database update
    });

    metrics['done'] = false;

    // Check if the responsiveness method is failing due to incorrect mock data
    expect(() => {
        (metrics as any)._calculateMetrics();
    }).not.toThrow();  // Ensure no process.exit is called

    // Ensure that updateEntry was called with the correct parameters
    expect(dbUpdateSpy).toHaveBeenCalledWith(
      expect.anything(),
      'https://example.com',
      expect.any(Number),
      expect.any(Number),
      undefined,
      expect.any(String)
    );
});



    
// test('should emit "done" event after calculating metrics', () => {
//     const doneSpy = jest.spyOn(metrics, 'emit');

//     // Mock the database to return valid rows
//     const mockRows = [
//       {
//         id: 1,
//         url: 'https://example.com',
//         information: '{"top3": 10, "commits/yr": 100, "downloads": 500000, "issuesClosedYr": 5, "issuesOpenedYr": 10}',
//         metrics: null,
//       }
//     ];

//     // Ensure the all() method returns the mock rows
//     jest.spyOn(mockDatabase.prepare(), 'all').mockReturnValue(mockRows);

//     // Call the method
//     metrics.calc(1); 
    
//     // Expect the done event to be emitted
//     expect(doneSpy).toHaveBeenCalledWith('done', 1);
// });


  
});
