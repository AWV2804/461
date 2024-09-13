import axios from 'axios';
import 'dotenv/config';


const token: string = process.env.GITHUB_TOKEN || "";

const baseURL = 'https://api.github.com';
const commitsMap = new Map<string, number>(); // Create a map to store data to calculate metrics

export async function baseGet(url: string, apiKey: string, params?: any) {
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
        throw error;
    }
}


// Fetch commits by the top 3 contributors and sum their contributions
async function getTopContributors(owner: string, repo: string) {
    const url = `${baseURL}/repos/${owner}/${repo}/contributors`;
    const contributors = await baseGet(url, token);
    
    let totalCommits = 0;
    
    // Assuming the contributors are sorted by commit count, sum the contributions of the top 3
    for (let i = 0; i < 3 && i < contributors.data.length; i++) {
        totalCommits += contributors.data[i].contributions;
    }

    // Store the total number of commits by the top 3 contributors in the map
    commitsMap.set('Top3ContributorsCommits', totalCommits);
}


async function getCommitsPastYear(owner: string, repo: string) {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  let page = 1;
  const per_page = 100; // Maximum allowed by GitHub API
  let totalCommits = 0;
  let hasMore = true;

  while (hasMore) {
      const url = `${baseURL}/repos/${owner}/${repo}/commits`;
      const params = {
          since: oneYearAgo.toISOString(),
          per_page: per_page,
          page: page,
      };

      const commits = await baseGet(url, token, params);

      totalCommits += commits.data.length;

      if (commits.data.length < per_page) {
          hasMore = false; // No more pages to fetch
      } else {
          page++; // Move to the next page
      }
  }

  // Store the total number of commits in the past year
  commitsMap.set('CommitsPastYear', totalCommits);
}

interface DownloadData {
    downloads: number;
    start: string;
    end: string;
    package: string;
}

async function getTotalDownloads(packageName: string, period: string = 'last-year') {

    const url = `https://api.npmjs.org/downloads/point/${period}/${packageName}`;
    try {
        const response = await axios.get<DownloadData>(url);
        const downloads = response.data.downloads;

        // Store the package name and total downloads in the map
        commitsMap.set('downloads', downloads);
        
        // console.log(`Total downloads for ${packageName}:`, downloads);
        return downloads;
    } catch (error) {
        console.log(`Error fetching downloads for package ${packageName}:`, error);
        return null;
    }
}


// Fetch the number of resolved (closed) issues

interface Issue {
    number: number;
    title: string;
    created_at: string;
    closed_at: string;
}

async function getClosedIssues(owner: string, repo: string) {
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
  
      const url = `${baseURL}/repos/${owner}/${repo}/issues`;
  
      const response = await baseGet(url, token, params);
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
  
      const url = `${baseURL}/repos/${owner}/${repo}/issues`;
  
      const response = await baseGet(url, token, params);
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
    commitsMap.set('iss3', iss3);
    commitsMap.set('iss7', iss7);
    commitsMap.set('iss14', iss14);
    commitsMap.set('iss31', iss31);
    commitsMap.set('totalIssuesSixMonths', issuesSixMonths.length);
    commitsMap.set('totalIssuesOneYear', issuesOneYear.length);
}


// Fetch the license information of the repository and store the SPDX ID
async function getLicenseInfo(owner: string, repo: string) {
    const url = `${baseURL}/repos/${owner}/${repo}/license`;
    try {
        const licenseInfo: any = await baseGet(url, token);
        const spdxId = licenseInfo.license?.spdx_id || 'No SPDX ID';
        console.log('License:', spdxId);

        // Store the SPDX ID in the map
        commitsMap.set('SPDX_ID', spdxId);
    } catch (error) {
        console.error('Error fetching license information:', error);
        commitsMap.set('SPDX_ID', -1); // Handle case where the license is unavailable
    }
}

// export async function getLicense(owner: string, repo: string, apiKey: string) {
//     const url = `${baseURL}/repos/${owner}/${repo}/license`;
//     try {
//         const response = await baseGet(url, apiKey);
//         console.log(response.data);
//     } catch (error) {
//         console.error(error);
//     }
// }

// Function to fetch all metrics
async function getRepoMetrics(owner: string, repo: string) {
    await getTopContributors(owner, repo);
    await getCommitsPastYear(owner, repo);
    await getTotalDownloads(repo, 'last-year');
    // await getTotalIssues(owner, repo);
    // await getIssuesPastYear(owner, repo);
    // console.log('check8');
    await getClosedIssues(owner, repo);
    // console.log('check9');
    // await getAllIssues(owner, repo);
    
    await getLicenseInfo(owner, repo);

    // Log the metrics stored in the map
    console.log(commitsMap);
}

// const owner = 'AWV2804';
// const repo = 'boilermate';

// const owner = 'expressjs'
// const repo = 'express'

const owner = 'caolan';
const repo = 'async';  // async library

getRepoMetrics(owner, repo);


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