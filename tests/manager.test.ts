import { Manager } from '../manager';
import { Command } from 'commander';
import { EventEmitter } from 'stream';

describe('Manager', () => {
  let manager: Manager;
  let logSpy: jest.SpyInstance;
  let mockAction: jest.Mock;

  beforeEach(() => {
    manager = new Manager(1, 0); // Initialize with dummy values for `fp` and `loglvl`
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {}); // Mock console.log to prevent actual logging in tests
    mockAction = jest.fn(); // Create a mock function to verify command actions
  });

  afterEach(() => {
    jest.restoreAllMocks(); // Reset mocks after each test
  });

  it('should initialize the Manager with default values', () => {
    expect(manager).toBeInstanceOf(EventEmitter);
    expect(manager['fp']).toBe(1); // `fp` initialized correctly
    expect(manager['loglvl']).toBe(0); // `loglvl` initialized correctly
  });

  it('should register and execute the "install" command', () => {
    manager.registerCommand('install', 'Install dependencies', mockAction);

    // Simulate execution of the "install" command
    manager.execute(['node', 'test', 'install']);

    expect(mockAction).toHaveBeenCalled(); // Verify action is called
    expect(mockAction).toHaveBeenCalledWith({}); // Verify action is called with empty object
  });

  it('should register and execute the "process" command with file argument', () => {
    manager.registerCommand('process', 'Process a file', mockAction);

    // Simulate execution of the "process" command with a file argument
    manager.execute(['node', 'test', 'process', 'file.txt']);

    expect(mockAction).toHaveBeenCalled(); // Verify action is called
    expect(mockAction).toHaveBeenCalledWith({ file: 'file.txt' }); // Verify action is called with correct file
  });

  it('should register and execute the "test" command', () => {
    manager.registerCommand('test', 'Run tests', mockAction);

    // Simulate execution of the "test" command
    manager.execute(['node', 'test', 'test']);

    expect(mockAction).toHaveBeenCalled(); // Verify action is called
    expect(mockAction).toHaveBeenCalledWith({}); // Verify action is called with empty object
  });

  it('should display help when no command is provided', () => {
    const helpSpy = jest.spyOn(Command.prototype, 'help').mockImplementation(() => {
        throw new Error('help called');
    });

    expect(() => manager.execute(['node', 'test'])).toThrow('help called'); // Expect help to be called
  });

  it('should print help when calling printHelp method', () => {
    const helpSpy = jest.spyOn(Command.prototype, 'help').mockImplementation(() => {
        throw new Error('help called');
    });

    expect(() => manager['printHelp']()).toThrow('help called'); // Verify help is called
});
});