import { Manager } from './manager'
import { exec } from 'child_process'
import { Metrics } from './calc_metrics'
import * as database from './database'
import { Controller } from './controller'
import { OutputMetrics } from './output_metrics'
import { UrlHandler } from './url_handler'
// import git from 'isomorphic-git'

import fs from 'fs'


const logfile = process.env.LOG_FILE as string;
let logLvl = process.env.LOG_LEVEL as string;

if(logfile == "") {
    console.error("No logfile given");
    process.exit(1);
}
if(process.env.GITHUB_TOKEN as string == "") {
    console.error("No github token given");
    process.exit(1);
}
if(logLvl == "") {
    logLvl = "0";
}
const fp = fs.openSync(logfile, 'w');
const manager = new Manager(fp, +logLvl);
manager.registerCommand('process', 'Process a file of URLs for scoring', (args) => {
    if (args.file) {
        const filePath = args.file;
        const data = fs.readFileSync(filePath, 'utf8');

        const lines = data.split('\n');
        const db = database.createConnection(fp, +logLvl);
        const metric_calc = new Metrics(db, fp, +logLvl);
        if(+logLvl == 2) { 
            fs.writeFileSync(fp, `${lines.length}\n`);
        }
        const output_metrics = new OutputMetrics(db, lines.length, fp, +logLvl);
        const urlHandler = new UrlHandler(db, fp, +logLvl);
        const controller = new Controller(manager, metric_calc, output_metrics, urlHandler, fp, +logLvl);
        database.createTable(db, fp, +logLvl);
        
        lines.forEach((line: string, index: number) => {
            if(+logLvl == 2) {
                fs.writeFileSync(fp, `${line}\n`);
            }
            if(line != "") {
                database.addEntry(db, line, fp, +logLvl);
                manager.emit('startProcessing', index+1)
            }
            
        });
        
    } else {
        fs.closeSync(fp);
        console.error('No file specified.');
        process.exit(1);
    }
    
    
});

manager.registerCommand('test', 'Test suite', () => {
    exec('npx jest --silent --coverage --detectOpenHandles > jest-output.txt 2>&1', (error, stderr, stdout) => {
        // Read the Jest output from the file
        const jestOutput = fs.readFileSync('jest-output.txt', 'utf8');
        
        // Extract the line coverage percentage from the output
        const allFilesLine = jestOutput.split('\n').find(line => line.startsWith('All files'));
        let lineCoverage = 0;

        if (allFilesLine) {
            const lineCoverageMatch = allFilesLine.match(/\s+(\d+\.\d+)\s+\|\s+\d+\.\d+\s+\|\s+\d+\.\d+\s+\|\s+(\d+\.\d+)\s+\|/);
            if (lineCoverageMatch && lineCoverageMatch[2]) {
                lineCoverage = parseFloat(lineCoverageMatch[2]);
            }
        }

        // Extract total tests and passed tests from the Jest output
        const testsLine = jestOutput.split('\n').find(line => line.startsWith('Tests:'));
        let totalTests = 0;
        let passedTests = 0;
        if (testsLine) {
            const testsMatch = testsLine.match(/Tests:\s+(\d+)\s+passed,\s+(\d+)\s+total/);
            if (testsMatch) {
                passedTests = parseInt(testsMatch[1], 10);
                totalTests = parseInt(testsMatch[2], 10);
            }
        }

        // Output the results in the format: "X/Y test cases passed. Z% line coverage achieved."
        console.log(`Total: ${totalTests}`);
        console.log(`Passed: ${passedTests}`);
        console.log(`Coverage: ${lineCoverage.toFixed(0)}`);
        console.log(`${passedTests}/${totalTests} test cases passed. ${lineCoverage.toFixed(0)}% line coverage achieved.`);
    });
});

manager.execute(process.argv);