import axios from 'axios';
import Database from 'better-sqlite3';
import 'dotenv/config';
import { get } from 'http';
import { EventEmitter  } from 'stream';
import * as database from './database'
import * as fs from 'fs';
import * as path from 'path';
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';

export interface DownloadData {
  downloads: number;
  start: string;
  end: string;
  package: string;
}

export interface Issue {
  number: number;
  title: string;
  created_at: string;
  closed_at: string;
}

export interface OwnerRepo {
  owner: string;
  repo: string;
}

export interface RowInfo {
  /**
   * Interface for the rows fetched from the database.
   * Only used to parse the data from the database and put it into correct data structures
   * for the Metrics class to then calculate metrics.
   */
  id: number,
  url: string,
  information: string | null, 
  metrics: string | null
}

export class UrlHandler extends EventEmitter {
  private token: string = process.env.GITHUB_TOKEN || "";

  private baseURL = 'https://api.github.com';
  private commitsMap = new Map<string, number>(); // Create a map to store data to calculate metrics
  private _db: Database.Database;
  private fp: number;
  private logLvl: number;

  constructor(db: Database.Database, fp: number, logLvl: number) {
    super();
    this._db = db;
    this.fp = fp;
    this.logLvl = logLvl;
  }
  private async baseGet(url: string, apiKey: string, params?: any) {
      try {
          const response = await axios.get(url, {
              headers: {
                  Authorization: `Bearer ${apiKey}`
              },
              params: params
          });
          return response;
      } catch (error) {
          console.error('Error occurred while making the request:', error);
          process.exit(1);
      }
  }
  
  
  // Fetch commits by the top 3 contributors in the past year and sum their contributions
  async getTopContributors(owner: string, repo: string) {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    // Step 1: Get contributors and find top 3
    const contributorsUrl = `${this.baseURL}/repos/${owner}/${repo}/contributors`;
    const contributors = await this.baseGet(contributorsUrl, this.token, { per_page: 100 });

    // Sort contributors by number of commits and select top 3
    const topContributors = contributors.data
        .sort((a: any, b: any) => b.contributions - a.contributions)
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
                author: contributor.login,  // Get commits from this contributor
                per_page: per_page,
                page: page,
            };

            const commits = await this.baseGet(url, this.token, params);

            contributorCommits += commits.data.length;

            if (commits.data.length < per_page) {
                hasMore = false; // No more pages to fetch
            } else {
                page++; // Move to the next page
            }
        }

        totalCommitsFromTop3 += contributorCommits;
    }

    // Step 3: Store the total number of commits from top 3 contributors in the past year
    this.commitsMap.set('top3', totalCommitsFromTop3);
}

private async getPackageNameFromGitHub(owner: string, repo: string): Promise<string | null> {
  const url = `${this.baseURL}/repos/${owner}/${repo}/contents/package.json`;
  try {
      const response = await this.baseGet(url, this.token);
      if (response.data && response.data.content) {
          // The content is base64 encoded
          const packageJsonContent = Buffer.from(response.data.content, 'base64').toString('utf8');
          const packageJson = JSON.parse(packageJsonContent);
          return packageJson.name;
      }
  } catch (error) {
      console.error('Error fetching package.json from GitHub:', error);
  }
  return null;
}
  
  async getCommitsPastYear(owner: string, repo: string) {
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
        } else {
            page++; // Move to the next page
        }
    }
  
    // Store the total number of commits in the past year
    this.commitsMap.set('commits/yr', totalCommits);
  }

  private async getTotalDownloads(packageName: string, period: string = 'last-year') {
  
      const url = `https://api.npmjs.org/downloads/point/${period}/${packageName}`;
      try {
          const response = await axios.get<DownloadData>(url);
          const downloads = response.data.downloads;
  
          // Store the package name and total downloads in the map
          this.commitsMap.set('downloads', downloads);
          
          // console.log(`Total downloads for ${packageName}:`, downloads);
          return downloads;
      } catch (error) {
          console.log(`Error fetching downloads for package ${packageName}:`, error);
          process.exit(1);
      }
  }
  
  
  // Fetch the number of resolved (closed) issues
  
  
  
  private async getClosedIssues(owner: string, repo: string) {
      const now = new Date();
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(now.getMonth() - 6);
    
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(now.getFullYear() - 1);
    
      let page = 1;
      const perPage = 100;
      let issuesSixMonths: Issue[] = [];
      let issuesOneYear: Issue[] = [];
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
        } else {
          // Exclude pull requests
          const filteredIssues = data.filter((issue: any) => !issue.pull_request);
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
        } else {
          // Exclude pull requests
          const filteredIssues = data.filter((issue: any) => !issue.pull_request);
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
        const diffDays = Math.ceil(
          (closedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
        );
    
        if (diffDays <= 3) {
          iss3++;
        } else if (diffDays <= 7) {
          iss7++;
        } else if (diffDays <= 14) {
          iss14++;
        } else if (diffDays <= 31) {
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
  
  
  // // Fetch the license information of the repository and store the SPDX ID
  // private async getLicenseInfo(owner: string, repo: string) {
  //     const url = `${this.baseURL}/repos/${owner}/${repo}/license`;
  //     try {
  //         const licenseInfo: any = await this.baseGet(url, this.token);
  //         const spdxId = licenseInfo.license?.spdx_id || 'No SPDX ID';
  //         //console.log('License:', spdxId);
  
  //         // Store the SPDX ID in the map
  //         this.commitsMap.set('license', spdxId);
  //     } catch (error) {
  //         console.error('Error fetching license information:', error);
  //         process.exit(1);
  //     }
  // }

  private async checkLicense(repoUrl: string): Promise<void> {
    const dir = path.join(__dirname, 'temp-repo');

    // Remove the temp directory if it already exists
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }

    try {
      // Clone the repository with depth 1
      await git.clone({
        fs,
        http,
        dir,
        url: repoUrl,
        singleBranch: true,
        depth: 1,
      });

      // Possible license file names
      const licenseFiles = [
        'LICENSE',
        'LICENSE.txt',
        'LICENSE.md',
        'COPYING',
        'COPYING.txt',
      ];

      let licenseContent = '';

      // Search for the license file
      for (const fileName of licenseFiles) {
        const filePath = path.join(dir, fileName);
        if (fs.existsSync(filePath)) {
          licenseContent = fs.readFileSync(filePath, 'utf-8');
          break;
        }
      }

      let result = 0;

      if (licenseContent) {
        result = 1;
      } else {
        console.log('No license file found.');
      }

      // Add the result to the commitsMap
      this.commitsMap.set('License', result);

    } catch (error) {
      console.error('Error during cloning or license checking:', error);
      // Set result to 0 in case of error
      this.commitsMap.set('License', 0);
    } finally {
      // Ensure the temp directory is removed even if an error occurs
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
  }
  
  private async getOwnerAndRepo(url: string): Promise<OwnerRepo> {
    if (this.isGitHubUrl(url)) {
        // GitHub URL: Extract owner and repo
        const ownerRepo = this.extractOwnerRepoFromGitHubUrl(url);
        if (ownerRepo) {
            return ownerRepo;
        } else {
            console.error('Invalid GitHub URL format.');
            process.exit(1);
        }
    } else if (this.isNpmUrl(url)) {
        // npmjs.com URL: Extract package name and get GitHub repo
        const packageName = this.extractPackageNameFromNpmUrl(url);
        if (!packageName) {
            console.error('Invalid npm package URL');
            process.exit(1);  // Exit the process
        }
        const repoUrl = await this.getRepositoryUrlFromNpm(packageName);
        if (repoUrl && this.isGitHubUrl(repoUrl)) {
            const ownerRepo = this.extractOwnerRepoFromGitHubUrl(repoUrl);
            if (ownerRepo) {
                return ownerRepo;
            } else {
                console.error('Invalid GitHub repository URL in npm package.');
                process.exit(1);
            }
        } else {
            console.error('Repository URL not found in npm package data.');
            process.exit(1);
        }
    } else {
        console.error('URL must be a GitHub or npm package URL.');
        process.exit(1);
    }
  }
  
  private isGitHubUrl(url: string): boolean {
    // Checks if the URL is a GitHub repository URL
    return /^https?:\/\/(www\.)?github\.com\/[^\/]+\/[^\/]+/i.test(url);
  }
  
  private isNpmUrl(url: string): boolean {
    // Checks if the URL is an npm package URL
    return /^https?:\/\/(www\.)?npmjs\.com\/package\/(@?[^\/]+)/i.test(url);
  }
  
  private extractOwnerRepoFromGitHubUrl(url: string): OwnerRepo | null {
    // Extracts the owner and repo from a GitHub URL
    const regex = /^https?:\/\/(www\.)?github\.com\/([^\/]+)\/([^\/]+)(\/|$)/i;
    const match = url.match(regex);
    if (match && match[2] && match[3]) {
        return { owner: match[2], repo: match[3] };
    }
    return null;
  }
  
  private extractPackageNameFromNpmUrl(url: string): string | null {
    // Extracts the package name from an npm package URL
    const regex = /^https?:\/\/(www\.)?npmjs\.com\/package\/(@?[^\/]+)/i;
    const match = url.match(regex);
    if (match && match[2]) {
        return decodeURIComponent(match[2]);
    }
    return null;
  }
  
  private async getRepositoryUrlFromNpm(packageName: string): Promise<string | null> {
    // Fetches the repository URL from the npm registry
    const registryUrl = `https://registry.npmjs.org/${packageName}`;
    try {
        const response = await axios.get(registryUrl);
        const data = response.data;
  
        // First, check if 'repository' exists at the top level
        let repoUrl: string | null = this.extractRepositoryUrl(data.repository);
        if (repoUrl) {
            repoUrl = this.normalizeRepoUrl(repoUrl);
            return repoUrl;
        }
  
        // If not, look for the 'latest' version and check its 'repository' field
        const latestVersionNumber = data['dist-tags']?.latest;
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
    } catch (error) {
        console.error(`Error fetching npm package data: ${error.message}`);
        process.exit(1);
    }
  }
  
  private extractRepositoryUrl(repository: any): string | null {
    // Extracts the repository URL from the 'repository' field
    if (repository) {
        if (typeof repository === 'string') {
            return repository;
        } else if (typeof repository.url === 'string') {
            return repository.url;
        }
    }
    return null;
  }
  
  private normalizeRepoUrl(url: string): string {
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
  
  private async getRepoMetrics(owner: string, repo: string, row: RowInfo) {
    await this.getTopContributors(owner, repo);
    await this.getCommitsPastYear(owner, repo);
    
    // Fetch the correct package name
    const packageName = await this.getPackageNameFromGitHub(owner, repo);
    if (packageName) {
        await this.getTotalDownloads(packageName, 'last-year');
    } else {
        console.log('Package name not found in package.json.');
        this.commitsMap.set('downloads', 0); // Set downloads to 0 if package name not found
    }
    
    await this.getClosedIssues(owner, repo);
    await this.checkLicense(row.url);
    console.log(this.commitsMap);
    database.updateEntry(
        this._db,
        row.url,
        this.fp,
        this.logLvl,
        JSON.stringify(Object.fromEntries(this.commitsMap))
    );
}
  
  
  async main(id: number) {
    //can use any url
    const rows: RowInfo[] = this._db.prepare(`SELECT * FROM package_scores WHERE id = ?`).all(id) as RowInfo[];
    console.log("pog1");
    const { owner, repo } = await this.getOwnerAndRepo(rows[0].url);
    console.log("pog2");
    await this.getRepoMetrics(owner, repo, rows[0]);
    this.emit('done', id);
  }
  
}
