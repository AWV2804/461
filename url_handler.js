"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.getOwnerAndRepo = exports.baseGet = void 0;
var axios_1 = require("axios");
require("dotenv/config");
var token = process.env.GITHUB_TOKEN || "";
var baseURL = 'https://api.github.com';
var commitsMap = new Map(); // Create a map to store data to calculate metrics
function baseGet(url, apiKey, params) {
    return __awaiter(this, void 0, void 0, function () {
        var response, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, axios_1["default"].get(url, {
                            headers: {
                                Authorization: "Bearer ".concat(apiKey)
                            },
                            params: params
                        })];
                case 1:
                    response = _a.sent();
                    return [2 /*return*/, response];
                case 2:
                    error_1 = _a.sent();
                    console.error('Error occurred while making the request:', error_1);
                    throw error_1;
                case 3: return [2 /*return*/];
            }
        });
    });
}
exports.baseGet = baseGet;
// Fetch commits by the top 3 contributors and sum their contributions
function getTopContributors(owner, repo) {
    return __awaiter(this, void 0, void 0, function () {
        var url, contributors, totalCommits, i;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    url = "".concat(baseURL, "/repos/").concat(owner, "/").concat(repo, "/contributors");
                    return [4 /*yield*/, baseGet(url, token)];
                case 1:
                    contributors = _a.sent();
                    totalCommits = 0;
                    // Assuming the contributors are sorted by commit count, sum the contributions of the top 3
                    for (i = 0; i < 3 && i < contributors.data.length; i++) {
                        totalCommits += contributors.data[i].contributions;
                    }
                    // Store the total number of commits by the top 3 contributors in the map
                    commitsMap.set('Top3ContributorsCommits', totalCommits);
                    return [2 /*return*/];
            }
        });
    });
}
function getCommitsPastYear(owner, repo) {
    return __awaiter(this, void 0, void 0, function () {
        var oneYearAgo, page, per_page, totalCommits, hasMore, url, params, commits;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    oneYearAgo = new Date();
                    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
                    page = 1;
                    per_page = 100;
                    totalCommits = 0;
                    hasMore = true;
                    _a.label = 1;
                case 1:
                    if (!hasMore) return [3 /*break*/, 3];
                    url = "".concat(baseURL, "/repos/").concat(owner, "/").concat(repo, "/commits");
                    params = {
                        since: oneYearAgo.toISOString(),
                        per_page: per_page,
                        page: page
                    };
                    return [4 /*yield*/, baseGet(url, token, params)];
                case 2:
                    commits = _a.sent();
                    totalCommits += commits.data.length;
                    if (commits.data.length < per_page) {
                        hasMore = false; // No more pages to fetch
                    }
                    else {
                        page++; // Move to the next page
                    }
                    return [3 /*break*/, 1];
                case 3:
                    // Store the total number of commits in the past year
                    commitsMap.set('CommitsPastYear', totalCommits);
                    return [2 /*return*/];
            }
        });
    });
}
function getTotalDownloads(packageName, period) {
    if (period === void 0) { period = 'last-year'; }
    return __awaiter(this, void 0, void 0, function () {
        var url, response, downloads, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    url = "https://api.npmjs.org/downloads/point/".concat(period, "/").concat(packageName);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, axios_1["default"].get(url)];
                case 2:
                    response = _a.sent();
                    downloads = response.data.downloads;
                    // Store the package name and total downloads in the map
                    commitsMap.set('downloads', downloads);
                    // console.log(`Total downloads for ${packageName}:`, downloads);
                    return [2 /*return*/, downloads];
                case 3:
                    error_2 = _a.sent();
                    console.log("Error fetching downloads for package ".concat(packageName, ":"), error_2);
                    return [2 /*return*/, null];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function getClosedIssues(owner, repo) {
    return __awaiter(this, void 0, void 0, function () {
        var now, sixMonthsAgo, oneYearAgo, page, perPage, issuesSixMonths, issuesOneYear, hasMoreSixMonths, hasMoreOneYear, params, url, response, data, filteredIssues, params, url, response, data, filteredIssues, iss3, iss7, iss14, iss31;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    now = new Date();
                    sixMonthsAgo = new Date();
                    sixMonthsAgo.setMonth(now.getMonth() - 6);
                    oneYearAgo = new Date();
                    oneYearAgo.setFullYear(now.getFullYear() - 1);
                    page = 1;
                    perPage = 100;
                    issuesSixMonths = [];
                    issuesOneYear = [];
                    hasMoreSixMonths = true;
                    hasMoreOneYear = true;
                    _a.label = 1;
                case 1:
                    if (!hasMoreSixMonths) return [3 /*break*/, 3];
                    params = {
                        state: 'closed',
                        since: sixMonthsAgo.toISOString(),
                        per_page: perPage,
                        page: page
                    };
                    url = "".concat(baseURL, "/repos/").concat(owner, "/").concat(repo, "/issues");
                    return [4 /*yield*/, baseGet(url, token, params)];
                case 2:
                    response = _a.sent();
                    data = response.data;
                    if (data.length === 0) {
                        hasMoreSixMonths = false;
                    }
                    else {
                        filteredIssues = data.filter(function (issue) { return !issue.pull_request; });
                        issuesSixMonths = issuesSixMonths.concat(filteredIssues);
                        page++;
                    }
                    return [3 /*break*/, 1];
                case 3:
                    // Reset page counter for one-year data
                    page = 1;
                    _a.label = 4;
                case 4:
                    if (!hasMoreOneYear) return [3 /*break*/, 6];
                    params = {
                        state: 'closed',
                        since: oneYearAgo.toISOString(),
                        per_page: perPage,
                        page: page
                    };
                    url = "".concat(baseURL, "/repos/").concat(owner, "/").concat(repo, "/issues");
                    return [4 /*yield*/, baseGet(url, token, params)];
                case 5:
                    response = _a.sent();
                    data = response.data;
                    if (data.length === 0) {
                        hasMoreOneYear = false;
                    }
                    else {
                        filteredIssues = data.filter(function (issue) { return !issue.pull_request; });
                        issuesOneYear = issuesOneYear.concat(filteredIssues);
                        page++;
                    }
                    return [3 /*break*/, 4];
                case 6:
                    iss3 = 0;
                    iss7 = 0;
                    iss14 = 0;
                    iss31 = 0;
                    issuesSixMonths.forEach(function (issue) {
                        var createdAt = new Date(issue.created_at);
                        var closedAt = new Date(issue.closed_at);
                        var diffDays = Math.ceil((closedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
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
                    commitsMap.set('iss3', iss3);
                    commitsMap.set('iss7', iss7);
                    commitsMap.set('iss14', iss14);
                    commitsMap.set('iss31', iss31);
                    commitsMap.set('totalIssuesSixMonths', issuesSixMonths.length);
                    commitsMap.set('totalIssuesOneYear', issuesOneYear.length);
                    return [2 /*return*/];
            }
        });
    });
}
// Fetch the license information of the repository and store the SPDX ID
function getLicenseInfo(owner, repo) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var url, licenseInfo, spdxId, error_3;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    url = "".concat(baseURL, "/repos/").concat(owner, "/").concat(repo, "/license");
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, baseGet(url, token)];
                case 2:
                    licenseInfo = _b.sent();
                    spdxId = ((_a = licenseInfo.license) === null || _a === void 0 ? void 0 : _a.spdx_id) || 'No SPDX ID';
                    console.log('License:', spdxId);
                    // Store the SPDX ID in the map
                    commitsMap.set('SPDX_ID', spdxId);
                    return [3 /*break*/, 4];
                case 3:
                    error_3 = _b.sent();
                    console.error('Error fetching license information:', error_3);
                    commitsMap.set('SPDX_ID', -1); // Handle case where the license is unavailable
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function getOwnerAndRepo(url) {
    return __awaiter(this, void 0, void 0, function () {
        var ownerRepo, packageName, repoUrl, ownerRepo;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!isGitHubUrl(url)) return [3 /*break*/, 1];
                    ownerRepo = extractOwnerRepoFromGitHubUrl(url);
                    if (ownerRepo) {
                        return [2 /*return*/, ownerRepo];
                    }
                    else {
                        throw new Error('Invalid GitHub URL format.');
                    }
                    return [3 /*break*/, 4];
                case 1:
                    if (!isNpmUrl(url)) return [3 /*break*/, 3];
                    packageName = extractPackageNameFromNpmUrl(url);
                    if (!packageName) {
                        throw new Error('Invalid npm package URL.');
                    }
                    return [4 /*yield*/, getRepositoryUrlFromNpm(packageName)];
                case 2:
                    repoUrl = _a.sent();
                    if (repoUrl && isGitHubUrl(repoUrl)) {
                        ownerRepo = extractOwnerRepoFromGitHubUrl(repoUrl);
                        if (ownerRepo) {
                            return [2 /*return*/, ownerRepo];
                        }
                        else {
                            throw new Error('Invalid GitHub repository URL in npm package.');
                        }
                    }
                    else {
                        throw new Error('GitHub repository not found for this npm package.');
                    }
                    return [3 /*break*/, 4];
                case 3: throw new Error('URL must be a GitHub or npm package URL.');
                case 4: return [2 /*return*/];
            }
        });
    });
}
exports.getOwnerAndRepo = getOwnerAndRepo;
function isGitHubUrl(url) {
    // Checks if the URL is a GitHub repository URL
    return /^https?:\/\/(www\.)?github\.com\/[^\/]+\/[^\/]+/i.test(url);
}
function isNpmUrl(url) {
    // Checks if the URL is an npm package URL
    return /^https?:\/\/(www\.)?npmjs\.com\/package\/(@?[^\/]+)/i.test(url);
}
function extractOwnerRepoFromGitHubUrl(url) {
    // Extracts the owner and repo from a GitHub URL
    var regex = /^https?:\/\/(www\.)?github\.com\/([^\/]+)\/([^\/]+)(\/|$)/i;
    var match = url.match(regex);
    if (match && match[2] && match[3]) {
        return { owner: match[2], repo: match[3] };
    }
    return null;
}
function extractPackageNameFromNpmUrl(url) {
    // Extracts the package name from an npm package URL
    var regex = /^https?:\/\/(www\.)?npmjs\.com\/package\/(@?[^\/]+)/i;
    var match = url.match(regex);
    if (match && match[2]) {
        return decodeURIComponent(match[2]);
    }
    return null;
}
function getRepositoryUrlFromNpm(packageName) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var registryUrl, response, data, repoUrl, latestVersionNumber, latestVersionData, error_4;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    registryUrl = "https://registry.npmjs.org/".concat(packageName);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, axios_1["default"].get(registryUrl)];
                case 2:
                    response = _b.sent();
                    data = response.data;
                    repoUrl = extractRepositoryUrl(data.repository);
                    if (repoUrl) {
                        repoUrl = normalizeRepoUrl(repoUrl);
                        return [2 /*return*/, repoUrl];
                    }
                    latestVersionNumber = (_a = data['dist-tags']) === null || _a === void 0 ? void 0 : _a.latest;
                    if (latestVersionNumber && data.versions && data.versions[latestVersionNumber]) {
                        latestVersionData = data.versions[latestVersionNumber];
                        repoUrl = extractRepositoryUrl(latestVersionData.repository);
                        if (repoUrl) {
                            repoUrl = normalizeRepoUrl(repoUrl);
                            return [2 /*return*/, repoUrl];
                        }
                    }
                    // Repository URL not found
                    return [2 /*return*/, null];
                case 3:
                    error_4 = _b.sent();
                    throw new Error("Error fetching npm package data: ".concat(error_4.message));
                case 4: return [2 /*return*/];
            }
        });
    });
}
function extractRepositoryUrl(repository) {
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
function normalizeRepoUrl(url) {
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
function getRepoMetrics(owner, repo) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getTopContributors(owner, repo)];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, getCommitsPastYear(owner, repo)];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, getTotalDownloads(repo, 'last-year')];
                case 3:
                    _a.sent();
                    // await getTotalIssues(owner, repo);
                    // await getIssuesPastYear(owner, repo);
                    // console.log('check8');
                    return [4 /*yield*/, getClosedIssues(owner, repo)];
                case 4:
                    // await getTotalIssues(owner, repo);
                    // await getIssuesPastYear(owner, repo);
                    // console.log('check8');
                    _a.sent();
                    // console.log('check9');
                    // await getAllIssues(owner, repo);
                    return [4 /*yield*/, getLicenseInfo(owner, repo)];
                case 5:
                    // console.log('check9');
                    // await getAllIssues(owner, repo);
                    _a.sent();
                    // Log the metrics stored in the map
                    console.log(commitsMap);
                    return [2 /*return*/];
            }
        });
    });
}
main();
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var _a, owner, repo;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, getOwnerAndRepo('https://www.npmjs.com/package/async')];
                case 1:
                    _a = _b.sent(), owner = _a.owner, repo = _a.repo;
                    getRepoMetrics(owner, repo);
                    return [2 /*return*/];
            }
        });
    });
}
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
