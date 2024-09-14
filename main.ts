import { Manager } from './manager'
import { exec } from 'child_process'
import { Metrics } from './calc_metrics'
import * as database from './database'
import { Controller } from './controller'
import fs from 'fs'

function runNpmInstall(): void {
    exec('npm install better-sqlite3 commander', (error, stdout, stderr) => {
        if(error) {
            console.error(`Error during npm install: ${error.message}`)
            return;
        }
        if(stderr) {
            console.error(`npm install stderr: ${stderr}`);
        }

        console.log(`npm install output: ${stdout}`);
    })
    exec('npm install --save-dev @types/better-sqlite3 @types/commander', (error, stdout, stderr) => {
        if(error) {
            console.error(`Error during npm install: ${error.message}`)
            return;
        }
        if(stderr) {
            console.error(`npm install stderr: ${stderr}`);
        }

        console.log(`npm install output: ${stdout}`);
    })
}

const manager = new Manager();
manager.registerCommand('process', 'Process a file of URLs for scoring', (args) => {
    if (args.file) {
        const filePath = args.file;
        const data = fs.readFileSync(filePath, 'utf8');

        const lines = data.split('\n');
        const db = database.createConnection();
        const metric_calc = new Metrics(db);
        const controller = new Controller(manager, metric_calc);
        database.createTable(db);
        lines.forEach((line: string, index: number) => {
            // console.log(line);
            database.addEntry(db, line);
            manager.emit('startProcessing', index+1)

        });
        
        // metric_calc.calc();
        database.closeConnection(db);
        
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