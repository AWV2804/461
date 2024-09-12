import { Manager } from './manager'
import { exec } from 'child_process'

function runNpmInstall(): void {
    exec('npm install sqlite3 commander', (error, stdout, stderr) => {
        if(error) {
            console.error(`Error during npm install: ${error.message}`)
            return;
        }
        if(stderr) {
            console.error(`npm install stderr: ${stderr}`);
        }

        console.log(`npm install output: ${stdout}`);
    })
    exec('npm install --save-dev @types/sqlite3 @types/commander', (error, stdout, stderr) => {
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

manager.registerCommand('install', 'Install dependencies', () => {
    runNpmInstall();
});

manager.registerCommand('process', 'Process a file of URLs for scoring', (args) => {
    const file = args.file;
    if(file) {
        console.log(`Processing file: ${file}`);
    } else {
        console.log(`No file provided for processing.`);
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