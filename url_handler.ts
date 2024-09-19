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
  private async baseGet(url: string, token: string, params?: any): Promise<any> {
  try {
    const headers: any = {
      'Accept': 'application/vnd.github.v3+json',
    };

    if (token) {
      headers['Authorization'] = `token ${token}`;
    }

    const response = await axios.get(url, {
      headers,
      params,
    });
    return response;
  } catch (error) {
    console.error('Error occurred while making the request:', error);
    throw error; // Let the caller handle the error
  }
}
  
  
  // Fetch commits by the top 3 contributors in the past year and sum their contributions
  async getTopContributors(owner: string, repo: string) {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    // Step 1: Get contributors and find top 3
    const contributorsUrl = `${this.baseURL}/repos/${owner}/${repo}/contributors`;
    const contributors = await this.baseGet(contributorsUrl, this.token, { per_page: 100 });

    if (!Array.isArray(contributors.data)) {
        console.error('Expected contributors.data to be an array, but got:', contributors.data);
        throw new Error('Invalid data received from GitHub API for contributors');
    }

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

            // Check if commits.data is an array
            if (!Array.isArray(commits.data)) {
                console.error('Expected commits.data to be an array, but got:', commits.data);
                throw new Error('Invalid data received from GitHub API for commits');
            }

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
            console.error(`Error fetching downloads for package ${packageName}:`, error);
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

    const perPage = 100;
    let page = 1;
    let issuesSixMonths: Issue[] = [];
    let issuesOneYear: Issue[] = [];

    // Initialize counts
    let iss3 = 0;
    let iss7 = 0;
    let iss14 = 0;
    let iss31 = 0;

    // Fetch issues closed within the last 6 months using the Search API
    const sixMonthsAgoISO = sixMonthsAgo.toISOString().split('T')[0]; // YYYY-MM-DD
    let hasMoreSixMonths = true;

    while (hasMoreSixMonths) {
      const params = {
        q: `repo:${owner}/${repo} is:issue is:closed closed:>=${sixMonthsAgoISO}`,
        per_page: perPage,
        page: page,
      };

      const url = `${this.baseURL}/search/issues`;

      try {
        const response = await this.baseGet(url, this.token, params);
        const data = response.data;

        const issues = data.items;
        if (issues.length === 0) {
          hasMoreSixMonths = false;
        } else {
          issuesSixMonths = issuesSixMonths.concat(issues);
          page++;
          // Check if we've reached the last page
          const totalCount = data.total_count;
          if (issuesSixMonths.length >= totalCount) {
            hasMoreSixMonths = false;
          }
        }
      } catch (error: any) {
        console.error('Error fetching issues from GitHub API:', error.message);
        break;
      }
    }

    // Reset page counter for one-year data
    page = 1;
    let hasMoreOneYear = true;
    const oneYearAgoISO = oneYearAgo.toISOString().split('T')[0]; // YYYY-MM-DD

    // Fetch issues closed within the last year using the Search API
    while (hasMoreOneYear) {
      const params = {
        q: `repo:${owner}/${repo} is:issue is:closed closed:>=${oneYearAgoISO}`,
        per_page: perPage,
        page: page,
      };

      const url = `${this.baseURL}/search/issues`;

      try {
        const response = await this.baseGet(url, this.token, params);
        const data = response.data;

        const issues = data.items;
        if (issues.length === 0) {
          hasMoreOneYear = false;
        } else {
          issuesOneYear = issuesOneYear.concat(issues);
          page++;
          // Check if we've reached the last page
          const totalCount = data.total_count;
          if (issuesOneYear.length >= totalCount) {
            hasMoreOneYear = false;
          }
        }
      } catch (error: any) {
        console.error('Error fetching issues from GitHub API:', error.message);
        break;
      }
    }

    // Calculate issue closure times for issues closed in the past 6 months
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
    this.commitsMap.set('issuesClosed6mth', issuesSixMonths.length);
    this.commitsMap.set('issuesClosedYr', issuesOneYear.length);
  }
  
  
  private async checkLicense(owner: string, repo: string): Promise<void> {
    const repoUrl = `https://github.com/${owner}/${repo}.git`;
    if(this.logLvl == 1) fs.writeFileSync(this.fp, `Cloning repository from ${repoUrl}...\n`);
  
    // Create a unique temporary directory for each repository
    const dir = path.join(__dirname, `temp-repo-${owner}-${repo}-${Date.now()}`);
  
    // Remove the temp directory if it already exists
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  
    let defaultBranch = 'main';
  
    try {
      // Fetch the default branch from GitHub API
      const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: {
          'Authorization': `token ${process.env.GITHUB_TOKEN}`, // Ensure GITHUB_TOKEN is set in your environment
        },
      });
      defaultBranch = response.data.default_branch || 'main';
      if(this.logLvl == 2) fs.writeFileSync(this.fp, `Default branch for ${owner}/${repo} is ${defaultBranch}\n`);
    } catch (error) {
      console.error('Error fetching repository data from GitHub API:', error.message);
      if(this.logLvl == 2) fs.writeFileSync(this.fp, 'falling back to default branch main\n');
    }
  
    try {
      // Clone the repository using the default branch
      await git.clone({
        fs,
        http,
        dir,
        url: repoUrl,
        singleBranch: true,
        depth: 1,
        ref: defaultBranch,
      });
      if(this.logLvl == 1) fs.writeFileSync(this.fp, `Repository cloned successfully to ${dir}\n`);
  
      // Possible license file names (case-insensitive)
      const licenseFiles = [
        'LICENSE',
        'LICENSE.txt',
        'LICENSE.md',
        'COPYING',
        'COPYING.txt',
        'UNLICENSE',
      ];
  
      const readmeFiles = [
        'README',
        'README.txt',
        'README.md',
      ];
  
      let licenseExists = false;
  
      // Recursive function to search for license files
      const searchForLicense = (currentDir: string): void => {
        const filesAndDirs = fs.readdirSync(currentDir);
        for (const name of filesAndDirs) {
          const fullPath = path.join(currentDir, name);
          const stats = fs.statSync(fullPath);
      
          if (stats.isDirectory()) {
            searchForLicense(fullPath);
            if (licenseExists) return; // Exit if license is found
          } else if (stats.isFile()) {
            const upperName = name.toUpperCase();
            // Check for license files
            if (licenseFiles.includes(upperName) && stats.size > 0) {
              licenseExists = true;
              if(this.logLvl == 2) fs.writeFileSync(this.fp, `License file found: ${fullPath}\n`);
              return; // Exit function
            }
            // Check for README files
            else if (readmeFiles.includes(upperName) && stats.size > 0) {
              if(this.logLvl == 2) fs.writeFileSync(this.fp, `README file found: ${fullPath}\n`);
              const content = fs.readFileSync(fullPath, 'utf8');
              if (searchReadmeForLicense(content)) {
                licenseExists = true;
                if(this.logLvl == 2) fs.writeFileSync(this.fp, `License information found in README: ${fullPath}\n`);
                return; // Exit function
              }
            }
            // Check for package.json
            else if (name.toLowerCase() === 'package.json' && stats.size > 0) {
              if(this.logLvl == 2) fs.writeFileSync(this.fp, `package.json file found: ${fullPath}\n`);
              const content = fs.readFileSync(fullPath, 'utf8');
              try {
                const packageJson = JSON.parse(content);
                if (packageJson.license) {
                  licenseExists = true;
                  if(this.logLvl == 2) fs.writeFileSync(this.fp, `License information found in package.json: ${fullPath}\n`);
                  return; // Exit function
                }
              } catch (err) {
                console.error(`Error parsing package.json: ${err.message}`);
              }
            }
          }
        }
      };
      
  
      // Function to search for license information in README content
      const searchReadmeForLicense = (content: string): boolean => {
        // Convert content to lowercase for case-insensitive search
        const lowerContent = content.toLowerCase();
      
        // Define keywords or patterns to search for, including both "license" and "licence"
        const licenseKeywords = [
          'license',
          'licence', // Added British English spelling
          'licensed under',
          'licenced under', // Added British English spelling
          'mit license',
          'mit licence', // Added British English spelling
          'apache license',
          'apache licence', // Added British English spelling
          'gpl',
          'bsd license',
          'bsd licence', // Added British English spelling
          'lgpl',
          'mozilla public license',
          'mozilla public licence', // Added British English spelling
          'unlicense',
          'unlicence', // Added British English spelling
          'isc license',
          'isc licence', // Added British English spelling
        ];
      
        // Check if any of the keywords are present
        return licenseKeywords.some(keyword => lowerContent.includes(keyword));
      };
  
      // Start the recursive search from the repository root directory
      searchForLicense(dir);
  
      // Set result to 1 if a license is found, otherwise 0
      const result = licenseExists ? 1 : 0;
      if(this.logLvl == 1) fs.writeFileSync(this.fp, `License exists: ${licenseExists}, result: ${result}\n`);
      this.commitsMap.set('license', result);
  
    } catch (error) {
      console.error('Error during cloning or license checking:', error.message);
      // Set license to 0 in case of error
      this.commitsMap.set('license', 0);
    } finally {
      // Clean up the temporary directory
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
        if(this.logLvl == 1) fs.writeFileSync(this.fp, `Removed temporary directory: ${dir}\n`);
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
  
  private isNpmUrl(url: string): boolean {
    // Checks if the URL is an npm package URL
    return /^https?:\/\/(www\.)?npmjs\.com\/package\/(@?[^\/]+)/i.test(url);
  }
  
  private extractOwnerRepoFromGitHubUrl(urlString: string): OwnerRepo | null {
    if(this.logLvl == 2) fs.writeFileSync(this.fp, `Extracting owner and repo from URL: ${urlString}\n`);
  
    try {
      const url = new URL(urlString);
      const pathname = url.pathname.replace(/^\//, ''); // Remove leading '/'
      const pathParts = pathname.split('/');
      if (pathParts.length >= 2) {
        const owner = pathParts[0];
        const repo = pathParts[1];
        if(this.logLvl == 2) fs.writeFileSync(this.fp, `Extracted owner: "${owner}", repo: "${repo}"\n`);
        return { owner, repo };
      }
    } catch (error) {
      console.error('Error parsing URL:', error);
    }
  
    console.error('Failed to extract owner and repo from URL.');
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
    const registryUrl = `https://registry.npmjs.org/${packageName}`;
    try {
      const response = await axios.get(registryUrl);
      const data = response.data;
  
      // Initialize an array to hold possible URLs
      const possibleUrls: string[] = [];
  
      // Check 'repository' field at the top level
      if (data.repository) {
        const repoUrl = this.extractRepositoryUrl(data.repository);
        if (repoUrl) {
          possibleUrls.push(repoUrl);
        }
      }
  
      // Check 'homepage' field at the top level
      if (data.homepage) {
        possibleUrls.push(data.homepage);
      }
  
      // Check 'bugs.url' field at the top level (sometimes used)
      if (data.bugs && data.bugs.url) {
        possibleUrls.push(data.bugs.url);
      }
  
      // Check 'latest' version fields
      const latestVersionNumber = data['dist-tags']?.latest;
      if (latestVersionNumber && data.versions && data.versions[latestVersionNumber]) {
        const latestVersionData = data.versions[latestVersionNumber];
  
        // Check 'repository' field in the latest version data
        if (latestVersionData.repository) {
          const repoUrl = this.extractRepositoryUrl(latestVersionData.repository);
          if (repoUrl) {
            possibleUrls.push(repoUrl);
          }
        }
  
        // Check 'homepage' field in the latest version data
        if (latestVersionData.homepage) {
          possibleUrls.push(latestVersionData.homepage);
        }
  
        // Check 'bugs.url' field in the latest version data
        if (latestVersionData.bugs && latestVersionData.bugs.url) {
          possibleUrls.push(latestVersionData.bugs.url);
        }
      }
  
      // Now, process the possible URLs to find a GitHub URL
      for (let url of possibleUrls) {
        if (url) {
          url = this.normalizeRepoUrl(url);
          if (this.isGitHubUrl(url)) {
            return url;
          }
        }
      }
  
      // Repository URL not found
      console.error('Repository URL not found in npm package data.');
      return null;
    } catch (error: any) {
      console.error(`Error fetching npm package data: ${error.message}`);
      throw error; // Let the caller handle the error
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
    // Remove any 'git+' prefix
    url = url.replace(/^git\+/, '');
  
    // Remove any trailing '.git'
    url = url.replace(/\.git$/, '');
  
    // Convert SSH URLs to HTTPS
    if (url.startsWith('git@')) {
      url = url.replace('git@', 'https://').replace(':', '/');
    }
  
    // Convert 'git://' URLs to 'https://'
    if (url.startsWith('git://')) {
      url = url.replace('git://', 'https://');
    }
  
    // Ensure the URL starts with 'https://' or 'http://'
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
  
    return url;
  }
  
  private isGitHubUrl(url: string): boolean {
    // Checks if the URL is a GitHub repository URL
    return /^https?:\/\/(www\.)?github\.com\/[^\/]+\/[^\/]+/i.test(url);
  }
  
  private async getOpenedIssues(owner: string, repo: string) {
    const now = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(now.getFullYear() - 1);
  
    const perPage = 100;
    let page = 1;
    let issuesOpened: Issue[] = [];
    let hasMore = true;
    const oneYearAgoISO = oneYearAgo.toISOString().split('T')[0]; // YYYY-MM-DD
  
    // Fetch issues opened within the last year using the Search API
    while (hasMore) {
      const params = {
        q: `repo:${owner}/${repo} is:issue created:>=${oneYearAgoISO}`,
        per_page: perPage,
        page: page,
      };
  
      const url = `${this.baseURL}/search/issues`;
  
      try {
        const response = await this.baseGet(url, this.token, params);
        const data = response.data;
  
        const issues = data.items;
        if (issues.length === 0) {
          hasMore = false;
        } else {
          issuesOpened = issuesOpened.concat(issues);
          page++;
          // Check if we've reached the last page
          const totalCount = data.total_count;
          if (issuesOpened.length >= totalCount) {
            hasMore = false;
          }
        }
      } catch (error: any) {
        console.error('Error fetching opened issues from GitHub API:', error.message);
        break;
      }
    }
  
    // Store the total number of issues opened in the past year
    this.commitsMap.set('issuesOpenedYr', issuesOpened.length);
  }

  private async getRepoMetrics(owner: string, repo: string, row: RowInfo) {
    await this.getTopContributors(owner, repo);
    await this.getCommitsPastYear(owner, repo);
    
    // Fetch the correct package name
    const packageName = await this.getPackageNameFromGitHub(owner, repo);
    if (packageName) {
        await this.getTotalDownloads(packageName, 'last-year');
    } else {
        if(this.logLvl == 2) fs.writeFileSync(this.fp, 'Package name not found in package.json.\n');
        this.commitsMap.set('downloads', 0); // Set downloads to 0 if package name not found
    }
    
    await this.getClosedIssues(owner, repo);
    await this.checkLicense(owner, repo);
    await this.getOpenedIssues(owner, repo);
    if(this.logLvl == 1)fs.writeFileSync(this.fp, 'Metrics values finished.\n');
    if(this.logLvl == 2) fs.writeFileSync(this.fp, JSON.stringify(Object.fromEntries(this.commitsMap))+ '\n');
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
    const { owner, repo } = await this.getOwnerAndRepo(rows[0].url);
    await this.getRepoMetrics(owner, repo, rows[0]);
    this.emit('done', id);
  }
  
}
