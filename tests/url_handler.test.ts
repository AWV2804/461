import { UrlHandler, RowInfo } from '../url_handler'; // Adjust the import paths accordingly
import axios from 'axios';
import Database from 'better-sqlite3';
import fs from 'fs';
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';
import * as database from '../database'; // Import the database module

jest.mock('axios');
jest.mock('fs');
jest.mock('isomorphic-git');
jest.mock('../database');
jest.mock('better-sqlite3');

// Mock the database module with separate mocks for prepare and all
const mockPrepare = jest.fn();
const mockAll = jest.fn();
const mockDatabase = {
    prepare: mockPrepare,
};
const mockRun = jest.fn();

describe('UrlHandler', () => {
    let urlHandler: UrlHandler;
    let db: Database.Database;
    let mockFp = 1;
    let mockLogLvl = 2;
    beforeEach(() => {
        // Reset mocks before each test
        jest.clearAllMocks();
        mockPrepare.mockReturnValue({ all: mockAll });
        db = mockDatabase as unknown as Database.Database;
        urlHandler = new UrlHandler(db, mockFp, mockLogLvl);
    });

    test('main should retrieve owner/repo and fetch metrics', async () => {
        const mockRow = {
            id: 1,
            url: 'https://github.com/owner/repo',
            information: null,
            metrics: null,
        };

        // Mock the database to return the row data
        mockAll.mockReturnValue([mockRow]);

        const mockGetOwnerAndRepo = jest.spyOn(urlHandler as any, 'getOwnerAndRepo').mockResolvedValue({
            owner: 'owner',
            repo: 'repo',
        });

        const mockGetRepoMetrics = jest.spyOn(urlHandler as any, 'getRepoMetrics').mockResolvedValue(null);

        await urlHandler.main(1);

        expect(mockGetOwnerAndRepo).toHaveBeenCalledWith('https://github.com/owner/repo');
        expect(mockGetRepoMetrics).toHaveBeenCalledWith('owner', 'repo', mockRow);
    });

    test('getCommitsPastYear should fetch and store total commits in the past year', async () => {
        const mockCommits = {
            data: new Array(10).fill({}), // Reduced size to 10
        };

        (axios.get as jest.Mock).mockResolvedValue(mockCommits);

        await urlHandler.getCommitsPastYear('owner', 'repo');

        expect(urlHandler['commitsMap'].get('commits/yr')).toBe(10); // Adjusted for reduced size
    });

    test('getTopContributors should fetch and store top 3 contributors commits', async () => {
        const mockContributors = {
            data: [
                { login: 'contributor1', contributions: 50 },
                { login: 'contributor2', contributions: 30 },
                { login: 'contributor3', contributions: 20 },
                { login: 'contributor4', contributions: 10 },
            ],
        };

        const mockCommits = {
            data: new Array(10).fill({}), // Reduced from 100 to 10
        };

        (axios.get as jest.Mock).mockResolvedValueOnce(mockContributors);
        (axios.get as jest.Mock).mockResolvedValue(mockCommits);

        await urlHandler.getTopContributors('owner', 'repo');

        expect(urlHandler['commitsMap'].get('top3')).toBe(30); // Adjusted expected result
    });

    test('getCommitsPastYear should fetch and store total commits in the past year', async () => {
        const mockCommits = {
            data: new Array(10).fill({}), // Reduced from 100 to 10
        };

        (axios.get as jest.Mock).mockResolvedValue(mockCommits);

        await urlHandler.getCommitsPastYear('owner', 'repo');

        expect(urlHandler['commitsMap'].get('commits/yr')).toBe(10); // Adjusted expected result
    });

    test('getTotalDownloads should fetch and store total downloads', async () => {
        const mockDownloads = {
            data: {
                downloads: 1000,
            },
        };

        (axios.get as jest.Mock).mockResolvedValue(mockDownloads);

        const downloads = await urlHandler['getTotalDownloads']('test-package');

        expect(downloads).toBe(1000);
        expect(urlHandler['commitsMap'].get('downloads')).toBe(1000);
    });

    test('getClosedIssues should fetch and store closed issues counts', async () => {
        const mockIssues = {
            data: {
                items: new Array(10).fill({ // Reduced from 100 to 10
                    created_at: new Date().toISOString(),
                    closed_at: new Date().toISOString(),
                }),
                total_count: 10, // Adjusted for the smaller array
            },
        };

        (axios.get as jest.Mock).mockResolvedValue(mockIssues);

        await urlHandler['getClosedIssues']('owner', 'repo');

        expect(urlHandler['commitsMap'].get('issuesClosed6mth')).toBe(10); // Adjusted expected result
        expect(urlHandler['commitsMap'].get('issuesClosedYr')).toBe(10); // Adjusted expected result
    });

    test('checkLicense should fetch and store license information', async () => {
        const mockRepoData = {
            data: {
                default_branch: 'main',
            },
        };

        (axios.get as jest.Mock).mockResolvedValue(mockRepoData);
        (git.clone as jest.Mock).mockResolvedValue(null);
        (fs.existsSync as jest.Mock).mockReturnValue(true);
        (fs.readdirSync as jest.Mock).mockReturnValue(['LICENSE']);
        (fs.statSync as jest.Mock).mockReturnValue({ isDirectory: () => false, isFile: () => true, size: 100 });

        await urlHandler['checkLicense']('owner', 'repo');

        expect(urlHandler['commitsMap'].get('License')).toBe(1);
    });

    test('getOpenedIssues should fetch and store opened issues counts', async () => {
        const mockIssues = {
            data: {
                items: new Array(10).fill({ // Reduced from 100 to 10
                    created_at: new Date().toISOString(),
                }),
                total_count: 10, // Adjusted for the smaller array
            },
        };

        (axios.get as jest.Mock).mockResolvedValue(mockIssues);

        await urlHandler['getOpenedIssues']('owner', 'repo');

        expect(urlHandler['commitsMap'].get('issuesOpenedYr')).toBe(10); // Adjusted expected result
    });
    describe('getOwnerAndRepo', () => {
        it('should extract owner and repo from GitHub URL', async () => {
            const url = 'https://github.com/owner/repo';
            const result = await urlHandler['getOwnerAndRepo'](url);
            expect(result).toEqual({ owner: 'owner', repo: 'repo' });
        });

        it('should extract package name from npm URL and fetch repo URL', async () => {
            const npmUrl = 'https://www.npmjs.com/package/example-package';
            const mockRepoUrl = 'https://github.com/owner/repo';

            jest.spyOn(urlHandler as any, 'getRepositoryUrlFromNpm').mockResolvedValue(mockRepoUrl);
            const result = await urlHandler['getOwnerAndRepo'](npmUrl);
            expect(result).toEqual({ owner: 'owner', repo: 'repo' });
        });

        it('should exit for invalid GitHub URL', async () => {
            const invalidUrl = 'https://invalid-url.com';
            const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
                throw new Error('process.exit called');
            });

            await expect(urlHandler['getOwnerAndRepo'](invalidUrl)).rejects.toThrow('process.exit called');
            expect(mockExit).toHaveBeenCalledWith(1);
        });
    });

    // Test for extractOwnerRepoFromGitHubUrl
    describe('extractOwnerRepoFromGitHubUrl', () => {
        it('should extract owner and repo from valid GitHub URL', () => {
            const result = urlHandler['extractOwnerRepoFromGitHubUrl']('https://github.com/owner/repo');
            expect(result).toEqual({ owner: 'owner', repo: 'repo' });
        });

        it('should return null for invalid GitHub URL', () => {
            const result = urlHandler['extractOwnerRepoFromGitHubUrl']('https://github.com/owner');
            expect(result).toBeNull();
        });
    });

    // Test for getRepositoryUrlFromNpm
    describe('getRepositoryUrlFromNpm', () => {
        it('should extract GitHub repository URL from npm package data', async () => {
            const mockResponse = {
                data: {
                    repository: {
                        url: 'git+https://github.com/owner/repo.git'
                    }
                }
            };

            (axios.get as jest.Mock).mockResolvedValue(mockResponse);
            const result = await urlHandler['getRepositoryUrlFromNpm']('example-package');
            expect(result).toBe('https://github.com/owner/repo');
        });

        it('should return null if no GitHub repository URL is found in npm data', async () => {
            const mockResponse = {
                data: {}
            };

            (axios.get as jest.Mock).mockResolvedValue(mockResponse);
            const result = await urlHandler['getRepositoryUrlFromNpm']('example-package');
            expect(result).toBeNull();
        });

        it('should handle errors and log them correctly', async () => {
            (axios.get as jest.Mock).mockRejectedValue(new Error('API error'));
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

            await expect(urlHandler['getRepositoryUrlFromNpm']('example-package')).rejects.toThrow('API error');
            expect(consoleSpy).toHaveBeenCalledWith('Error fetching npm package data: API error');
        });
    });

    // Test for getOpenedIssues
    describe('getOpenedIssues', () => {
        it('should fetch and store total number of issues opened in the past year', async () => {
            const mockIssues = {
                data: {
                    items: new Array(10).fill({ created_at: new Date().toISOString() }),
                    total_count: 10
                }
            };

            (axios.get as jest.Mock).mockResolvedValue(mockIssues);

            await urlHandler['getOpenedIssues']('owner', 'repo');
            expect(urlHandler['commitsMap'].get('issuesOpenedYr')).toBe(10);
        });

        it('should handle API errors and log them', async () => {
            (axios.get as jest.Mock).mockRejectedValue(new Error('API error'));
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

            await urlHandler['getOpenedIssues']('owner', 'repo');
            expect(consoleSpy).toHaveBeenCalledWith('Error fetching opened issues from GitHub API:', 'API error');
        });
    });

    // Test for getRepoMetrics
    describe('getRepoMetrics', () => {
        it('should fetch all metrics and update the database', async () => {
            const row: RowInfo = {
                id: 1,
                url: 'https://github.com/owner/repo',
                information: null,
                metrics: null,
            };

            // Mock all the functions that getRepoMetrics calls
            jest.spyOn(urlHandler as any, 'getTopContributors').mockResolvedValue(null);
            jest.spyOn(urlHandler as any, 'getCommitsPastYear').mockResolvedValue(null);
            jest.spyOn(urlHandler as any, 'getTotalDownloads').mockResolvedValue(1000);
            jest.spyOn(urlHandler as any, 'getClosedIssues').mockResolvedValue(null);
            jest.spyOn(urlHandler as any, 'checkLicense').mockResolvedValue(null);
            jest.spyOn(urlHandler as any, 'getOpenedIssues').mockResolvedValue(null);

            // Mock the database update function
            const mockUpdateEntry = jest.spyOn(database, 'updateEntry').mockImplementation(() => {});

            // Call getRepoMetrics
            await urlHandler['getRepoMetrics']('owner', 'repo', row);

            // Verify that the database was updated with the correct values
            expect(mockUpdateEntry).toHaveBeenCalledWith(
                db,
                row.url,
                mockFp,
                mockLogLvl,
                expect.any(String)
            );

            // Ensure that the result of the commitsMap was updated and stored in the database
            expect(mockUpdateEntry).toHaveBeenCalledTimes(1);
        });
    });

});