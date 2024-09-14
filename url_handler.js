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
var axios_1 = require("axios");
require("dotenv/config");
var token = process.env.GITHUB_TOKEN || "";
var baseURL = 'https://api.github.com';
function getTotalCommits(owner, repo, apiKey) {
    return __awaiter(this, void 0, void 0, function () {
        var url, response, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    url = "".concat(baseURL, "/repos/").concat(owner, "/").concat(repo, "/commits");
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, baseGet(url, apiKey)];
                case 2:
                    response = _a.sent();
                    console.log(response.data);
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _a.sent();
                    console.error(error_1);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function getIssues(owner, repo, token) {
    return __awaiter(this, void 0, void 0, function () {
        var url, params, response;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    url = "".concat(baseURL, "/repos/").concat(owner, "/").concat(repo, "/issues");
                    params = {
                        state: 'all'
                    };
                    return [4 /*yield*/, baseGet(url, token, params)];
                case 1:
                    response = _a.sent();
                    if (response.data.error) {
                        console.error('Error fetching issues:', response.data.error);
                    }
                    console.log(response.data);
                    return [2 /*return*/, response.data];
            }
        });
    });
}
;
function baseGet(url, apiKey, params) {
    return __awaiter(this, void 0, void 0, function () {
        var response, error_2;
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
                    error_2 = _a.sent();
                    console.error('Error occurred while making the request:', error_2);
                    throw error_2;
                case 3: return [2 /*return*/];
            }
        });
    });
}
//SPDX license identifier IS WHAT IS IMPORTANT
function getLicense(owner, repo, apiKey) {
    return __awaiter(this, void 0, void 0, function () {
        var url, response, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    url = "".concat(baseURL, "/repos/").concat(owner, "/").concat(repo, "/license");
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, baseGet(url, apiKey)];
                case 2:
                    response = _a.sent();
                    console.log(response.data);
                    return [3 /*break*/, 4];
                case 3:
                    error_3 = _a.sent();
                    console.error(error_3);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function getDownloadCount(owner, repo, apiKey) {
    return __awaiter(this, void 0, void 0, function () {
        var url, response, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    url = "".concat(baseURL, "/repos/").concat(owner, "/").concat(repo, "/releases/latest");
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, baseGet(url, apiKey)];
                case 2:
                    response = _a.sent();
                    // const downloadCount = response.data.assets.reduce((total: number, asset: any) => total + asset.download_count, 0);
                    // console.log(`Total downloads: ${downloadCount}`);
                    console.log(response.data);
                    return [3 /*break*/, 4];
                case 3:
                    error_4 = _a.sent();
                    console.error(error_4);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
//https://github.com/cloudinary/cloudinary_npm
// const owner = 'AWV2804';
// const repo = 'boilermate';
var owner = 'matthewl121';
var repo = 'ACME_Corp_CLI_Interface';
getDownloadCount(owner, repo, token);
// getLicense(owner, repo, token);
// fetchIssues(owner, repo, token);
// getTotalCommits(owner, repo, token);
