import { Manager } from './manager'
import { exec } from 'child_process'
import { Metrics } from './calc_metrics'
import * as database from './database'
import { Controller } from './controller'
import { OutputMetrics } from './output_metrics'
import { UrlHandler } from './url_handler'
// import git from 'isomorphic-git'

import fs from 'fs'

const manager = new Manager();
const logfile = process.env.LOG_FILE as string;
const logLvl = process.env.LOG_LEVEL as string;

const fp = fs.openSync(logfile, 'w');
manager.registerCommand('process', 'Process a file of URLs for scoring', (args) => {
    if (args.file) {
        const filePath = args.file;
        const data = fs.readFileSync(filePath, 'utf8');

        const lines = data.split('\n');
        const db = database.createConnection(fp, +logLvl);
        const metric_calc = new Metrics(db, fp, +logLvl);
        console.log(lines);
        const output_metrics = new OutputMetrics(db, lines.length, fp, +logLvl);
        const urlHandler = new UrlHandler(db, fp, +logLvl);
        const controller = new Controller(manager, metric_calc, output_metrics, urlHandler, fp, +logLvl);
        database.createTable(db, fp, +logLvl);
        lines.forEach((line: string, index: number) => {
            console.log(line);
            database.addEntry(db, line, fp, +logLvl);
            manager.emit('startProcessing', index+1)
        });
        
        // metric_calc.calc();
        // database.closeConnection(db);
        
    } else {
        console.error('No file specified.');
        process.exit(1);
    }
    
    
});

manager.registerCommand('test', 'Test suite', () => {
    exec('npx jest --silent --coverage', (error, stderr, stdout) => {
        if(error) {
            console.error(`Error during npx jest: ${error.message}`)
            return;
        }
        if(stderr) {
            console.error(`npx jest stderr: ${stderr}`);
        }

        console.log(`npx jest output: ${stdout}`);
    });
});

manager.execute(process.argv);