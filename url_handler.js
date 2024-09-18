"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UrlHandler = void 0;
const axios_1 = __importDefault(require("axios"));
require("dotenv/config");
const stream_1 = require("stream");
const database = __importStar(require("./database"));
class UrlHandler extends stream_1.EventEmitter {
    constructor(db, fp, logLvl) {
        super();
        this.token = process.env.GITHUB_TOKEN || "";
        this.baseURL = 'https://api.github.com';
        this.commitsMap = new Map(); // Create a map to store data to calculate metrics
        this._db = db;
        this.fp = fp;
        this.logLvl = logLvl;
    }
    async baseGet(url, apiKey, params) {
        try {
            const response = await axios_1.default.get(url, {
                headers: {
                    Authorization: `Bearer ${apiKey}`
                },
                params: params
            });
            return response;
        }
        catch (error) {
            console.error('Error occurred while making the request:', error);
            throw error;
        }
    }
    // Fetch commits by the top 3 contributors in the past year and sum their contributions
    async getTopContributors(owner, repo) {
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        // Step 1: Get contributors and find top 3
        const contributorsUrl = `${this.baseURL}/repos/${owner}/${repo}/contributors`;
        const contributors = await this.baseGet(contributorsUrl, this.token, { per_page: 100 });
        // Sort contributors by number of commits and select top 3
        const topContributors = contributors.data
            .sort((a, b) => b.contributions - a.contributions)
            .slice(0, 3);
        let totalCommitsFromTop3 = 0;
        // Step 2: Fetch commits for each top contributor in the past year
        for (const contributor of topContributors) {
            let page = 1;
            const per_page = 100; // Maximum allowed by GitHub API
            let hasMore = true;
            let contributorCommits = 0;
            while (hasMore) {
                const url = `${this.baseURL}/repos/${owner}/${repo}/commits`;
                const params = {
                    since: oneYearAgo.toISOString(),
                    author: contributor.login,
                    per_page: per_page,
                    page: page,
                };
                const commits = await this.baseGet(url, this.token, params);
                contributorCommits += commits.data.length;
                if (commits.data.length < per_page) {
                    hasMore = false; // No more pages to fetch
                }
                else {
                    page++; // Move to the next page
                }
            }
            totalCommitsFromTop3 += contributorCommits;
        }
        // Step 3: Store the total number of commits from top 3 contributors in the past year
        this.commitsMap.set('top3', totalCommitsFromTop3);
    }
    async getCommitsPastYear(owner, repo) {
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        let page = 1;
        const per_page = 100; // Maximum allowed by GitHub API
        let totalCommits = 0;
        let hasMore = true;
        while (hasMore) {
            const url = `${this.baseURL}/repos/${owner}/${repo}/commits`;
            const params = {
                since: oneYearAgo.toISOString(),
                per_page: per_page,
                page: page,
            };
            const commits = await this.baseGet(url, this.token, params);
            totalCommits += commits.data.length;
            if (commits.data.length < per_page) {
                hasMore = false; // No more pages to fetch
            }
            else {
                page++; // Move to the next page
            }
        }
        // Store the total number of commits in the past year
        this.commitsMap.set('commits/yr', totalCommits);
    }
    async getTotalDownloads(packageName, period = 'last-year') {
        const url = `https://api.npmjs.org/downloads/point/${period}/${packageName}`;
        try {
            const response = await axios_1.default.get(url);
            const downloads = response.data.downloads;
            // Store the package name and total downloads in the map
            this.commitsMap.set('downloads', downloads);
            // console.log(`Total downloads for ${packageName}:`, downloads);
            return downloads;
        }
        catch (error) {
            console.log(`Error fetching downloads for package ${packageName}:`, error);
            return null;
        }
    }
    // Fetch the number of resolved (closed) issues
    async getClosedIssues(owner, repo) {
        const now = new Date();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(now.getMonth() - 6);
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(now.getFullYear() - 1);
        let page = 1;
        const perPage = 100;
        let issuesSixMonths = [];
        let issuesOneYear = [];
        let hasMoreSixMonths = true;
        let hasMoreOneYear = true;
        // Fetch issues closed within the last 6 months
        while (hasMoreSixMonths) {
            const params = {
                state: 'closed',
                since: sixMonthsAgo.toISOString(),
                per_page: perPage,
                page: page,
            };
            const url = `${this.baseURL}/repos/${owner}/${repo}/issues`;
            const response = await this.baseGet(url, this.token, params);
            const data = response.data;
            if (data.length === 0) {
                hasMoreSixMonths = false;
            }
            else {
                // Exclude pull requests
                const filteredIssues = data.filter((issue) => !issue.pull_request);
                issuesSixMonths = issuesSixMonths.concat(filteredIssues);
                page++;
            }
        }
        // Reset page counter for one-year data
        page = 1;
        // Fetch issues closed within the last year
        while (hasMoreOneYear) {
            const params = {
                state: 'closed',
                since: oneYearAgo.toISOString(),
                per_page: perPage,
                page: page,
            };
            const url = `${this.baseURL}/repos/${owner}/${repo}/issues`;
            const response = await this.baseGet(url, this.token, params);
            const data = response.data;
            if (data.length === 0) {
                hasMoreOneYear = false;
            }
            else {
                // Exclude pull requests
                const filteredIssues = data.filter((issue) => !issue.pull_request);
                issuesOneYear = issuesOneYear.concat(filteredIssues);
                page++;
            }
        }
        // Initialize counts
        let iss3 = 0;
        let iss7 = 0;
        let iss14 = 0;
        let iss31 = 0;
        issuesSixMonths.forEach((issue) => {
            const createdAt = new Date(issue.created_at);
            const closedAt = new Date(issue.closed_at);
            const diffDays = Math.ceil((closedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays <= 3) {
                iss3++;
            }
            else if (diffDays <= 7) {
                iss7++;
            }
            else if (diffDays <= 14) {
                iss14++;
            }
            else if (diffDays <= 31) {
                iss31++;
            }
        });
        // Store counts in commitsMap
        this.commitsMap.set('iss3', iss3);
        this.commitsMap.set('iss7', iss7);
        this.commitsMap.set('iss14', iss14);
        this.commitsMap.set('iss31', iss31);
        this.commitsMap.set('issues/6mth', issuesSixMonths.length);
        this.commitsMap.set('issues/yr', issuesOneYear.length);
    }
    // Fetch the license information of the repository and store the SPDX ID
    async getLicenseInfo(owner, repo) {
        var _a;
        const url = `${this.baseURL}/repos/${owner}/${repo}/license`;
        try {
            const licenseInfo = await this.baseGet(url, this.token);
            const spdxId = ((_a = licenseInfo.license) === null || _a === void 0 ? void 0 : _a.spdx_id) || 'No SPDX ID';
            console.log('License:', spdxId);
            // Store the SPDX ID in the map
            this.commitsMap.set('license', spdxId);
        }
        catch (error) {
            console.error('Error fetching license information:', error);
            this.commitsMap.set('license', -1); // Handle case where the license is unavailable
        }
    }
    async getOwnerAndRepo(url) {
        if (this.isGitHubUrl(url)) {
            // GitHub URL: Extract owner and repo
            const ownerRepo = this.extractOwnerRepoFromGitHubUrl(url);
            if (ownerRepo) {
                return ownerRepo;
            }
            else {
                throw new Error('Invalid GitHub URL format.');
            }
        }
        else if (this.isNpmUrl(url)) {
            // npmjs.com URL: Extract package name and get GitHub repo
            const packageName = this.extractPackageNameFromNpmUrl(url);
            if (!packageName) {
                throw new Error('Invalid npm package URL.');
            }
            const repoUrl = await this.getRepositoryUrlFromNpm(packageName);
            if (repoUrl && this.isGitHubUrl(repoUrl)) {
                const ownerRepo = this.extractOwnerRepoFromGitHubUrl(repoUrl);
                if (ownerRepo) {
                    return ownerRepo;
                }
                else {
                    throw new Error('Invalid GitHub repository URL in npm package.');
                }
            }
            else {
                throw new Error('GitHub repository not found for this npm package.');
            }
        }
        else {
            throw new Error('URL must be a GitHub or npm package URL.');
        }
    }
    isGitHubUrl(url) {
        // Checks if the URL is a GitHub repository URL
        return /^https?:\/\/(www\.)?github\.com\/[^\/]+\/[^\/]+/i.test(url);
    }
    isNpmUrl(url) {
        // Checks if the URL is an npm package URL
        return /^https?:\/\/(www\.)?npmjs\.com\/package\/(@?[^\/]+)/i.test(url);
    }
    extractOwnerRepoFromGitHubUrl(url) {
        // Extracts the owner and repo from a GitHub URL
        const regex = /^https?:\/\/(www\.)?github\.com\/([^\/]+)\/([^\/]+)(\/|$)/i;
        const match = url.match(regex);
        if (match && match[2] && match[3]) {
            return { owner: match[2], repo: match[3] };
        }
        return null;
    }
    extractPackageNameFromNpmUrl(url) {
        // Extracts the package name from an npm package URL
        const regex = /^https?:\/\/(www\.)?npmjs\.com\/package\/(@?[^\/]+)/i;
        const match = url.match(regex);
        if (match && match[2]) {
            return decodeURIComponent(match[2]);
        }
        return null;
    }
    async getRepositoryUrlFromNpm(packageName) {
        var _a;
        // Fetches the repository URL from the npm registry
        const registryUrl = `https://registry.npmjs.org/${packageName}`;
        try {
            const response = await axios_1.default.get(registryUrl);
            const data = response.data;
            // First, check if 'repository' exists at the top level
            let repoUrl = this.extractRepositoryUrl(data.repository);
            if (repoUrl) {
                repoUrl = this.normalizeRepoUrl(repoUrl);
                return repoUrl;
            }
            // If not, look for the 'latest' version and check its 'repository' field
            const latestVersionNumber = (_a = data['dist-tags']) === null || _a === void 0 ? void 0 : _a.latest;
            if (latestVersionNumber && data.versions && data.versions[latestVersionNumber]) {
                const latestVersionData = data.versions[latestVersionNumber];
                repoUrl = this.extractRepositoryUrl(latestVersionData.repository);
                if (repoUrl) {
                    repoUrl = this.normalizeRepoUrl(repoUrl);
                    return repoUrl;
                }
            }
            // Repository URL not found
            return null;
        }
        catch (error) {
            const newErr = error;
            throw new Error(`Error fetching npm package data: ${newErr.message}`);
        }
    }
    extractRepositoryUrl(repository) {
        // Extracts the repository URL from the 'repository' field
        if (repository) {
            if (typeof repository === 'string') {
                return repository;
            }
            else if (typeof repository.url === 'string') {
                return repository.url;
            }
        }
        return null;
    }
    normalizeRepoUrl(url) {
        // Normalizes the repository URL
        url = url.replace(/^git\+/, '').replace(/\.git$/, '');
        if (url.startsWith('git@')) {
            url = url.replace('git@', 'https://').replace(':', '/');
        }
        if (url.startsWith('git://')) {
            url = url.replace('git://', 'https://');
        }
        return url;
    }
    // Function to fetch all metrics
    async getRepoMetrics(owner, repo, row) {
        await this.getTopContributors(owner, repo);
        await this.getCommitsPastYear(owner, repo);
        await this.getTotalDownloads(repo, 'last-year');
        // await getTotalIssues(owner, repo);
        // await getIssuesPastYear(owner, repo);
        // console.log('check8');
        await this.getClosedIssues(owner, repo);
        // console.log('check9');
        // await getAllIssues(owner, repo);
        await this.getLicenseInfo(owner, repo);
        console.log(this.commitsMap);
        // Log the metrics stored in the map
        database.updateEntry(this._db, row.url, this.fp, this.logLvl, JSON.stringify(Object.fromEntries(this.commitsMap)));
        // console.log(this.commitsMap);
    }
    async main(id) {
        //can use any url
        const rows = this._db.prepare(`SELECT * FROM package_scores WHERE id = ?`).all(id);
        const { owner, repo } = await this.getOwnerAndRepo(rows[0].url);
        await this.getRepoMetrics(owner, repo, rows[0]);
        this.emit('done', id);
    }
}
exports.UrlHandler = UrlHandler;
// const owner = 'AWV2804';
// const repo = 'boilermate';
// const owner = 'expressjs'
// const repo = 'express'
// const owner = 'caolan';
// const repo = 'async';  // async library
// import { main } from 'module';
// main();
// export async function getTotalCommits(owner: string, repo: string, apiKey: string) {
//     const url = `${baseURL}/repos/${owner}/${repo}/commits`;
//     try {
//         const response = await baseGet(url, apiKey);
//         console.log(response.data);
//     } catch (error) {
//         console.error(error);
//     }
// }
// export async function getIssues(owner: string, repo: string, token: string){
//     const url = `${baseURL}/repos/${owner}/${repo}/issues`;
//     const params = {
//         state: 'all',
//     };
//     const response = await baseGet(url, token, params);
//     if (response.data.error) {
//         console.error('Error fetching issues:', response.data.error);
//     }
//     console.log(response.data);
//     return response.data;
// };
// export async function getContributors(owner: string, repo: string, token: string) {
//     const url = `${baseURL}/repos/${owner}/${repo}/contributors`;
//     try {
//         const response = await baseGet(url, token);
//         console.log(response.data);
//     } catch (error) {
//         console.error(error);
//     }
// }
// //SPDX license identifier IS WHAT IS IMPORTANT
// export async function getLicense(owner: string, repo: string, apiKey: string) {
//     const url = `${baseURL}/repos/${owner}/${repo}/license`;
//     try {
//         const response = await baseGet(url, apiKey);
//         console.log(response.data);
//     } catch (error) {
//         console.error(error);
//     }
// }
// export async function getDownloadCount(owner: string, repo: string, apiKey: string) {
//     const url = `${baseURL}/repos/${owner}/${repo}/releases/latest`;
//     try {
//         const response = await baseGet(url, apiKey);
//         // const downloadCount = response.data.assets.reduce((total: number, asset: any) => total + asset.download_count, 0);
//         // console.log(`Total downloads: ${downloadCount}`);
//         console.log(response.data);
//     } catch (error) {
//         console.error(error);
//     }
// }
// //https://github.com/cloudinary/cloudinary_npm
// const owner = 'AWV2804';
// const repo = 'boilermate';
// //getContributors(owner, repo, token);
// // getDownloadCount(owner, repo, token);
// // getLicense(owner, repo, token);
// // fetchIssues(owner, repo, token);
// // getTotalCommits(owner, repo, token);
// // getIssues(owner, repo, token);
