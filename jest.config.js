/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
    preset: 'ts-jest', // This ensures TypeScript files are processed with ts-jest
    testEnvironment: 'node', // Sets the test environment to Node.js
    transform: {
      "^.+\\.tsx?$": ["ts-jest", {}], // Handles TypeScript files (.ts and .tsx)
    },
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'], // Recognize these extensions
    testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$', // Match test files with .test.ts/.spec.ts
    collectCoverage: true, // Enable code coverage collection
    coverageDirectory: 'coverage', // Directory to store coverage reports
    testTimeout: 300000, // Increase test timeout to 5 minutes
    
};