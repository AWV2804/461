import { EventEmitter } from 'stream';
import * as database from './database'
import { Command } from 'commander'


interface CommandAction {
    /**
     * Interface to connect Command descriptions to their actions
     */
    description: string,
    action: (args: string[]) => void;
}

/**
 * Class that controls the command line arguments and determines what to do and what command to execute
 */
export class Manager extends EventEmitter {
    private program: Command;
    private commands: {[key: string]: CommandAction}
    private fp: number;
    private loglvl: number;

    constructor(fp: number, loglvl: number) {
        /**
         * Creates class
         * 
         * Inputs:
         * - fp: number  - logfile pointer if logging wanted to be added
         * - loglvl: number - log level set by user for specific level of logging wanted
         * 
         * Outputs:
         * - Manager
         */
        super();
        this.fp = fp;
        this.loglvl = loglvl;
        this.commands = {};
        this.program = new Command();
        this.program
            .action(() => {
                this.printHelp();
            });
    }

    registerCommand(commandName: string, description: string, action: (args: any) => void): void {
        /**
         * Registers commands that can be executed
         * 
         * Inputs:
         * - commandName: string - the name of the command to be executed
         * - description: strirng - description of the command to be executed
         * - action: (args: any) => void - Function that the executed command should execute
         * 
         * Outputs:
         * - None
         */
        this.commands[commandName] = {description, action};

        if(commandName == 'install') {
            this.program
                .command(commandName)
                .description(description)
                .action(() => {
                    action({});
                });
        } else if(commandName == 'process') {
            this.program
                .command(`${commandName} [file]`)
                .description(description)
                .action((file) => {
                    action({ file });
                });
        } else if(commandName == 'test') {
            this.program
                .command(commandName)
                .description(description)
                .action(() => {
                    action({});
                });
        }
    }

    
    private printHelp(): void {
        /**
         * Function to print what commands are available if an illegal command is attempted
         */
        this.program.help();
    }

    execute(args: string[]): void {
        /**
         * Executes the commands given in the arguments
         */
        this.program.parse(args);
    }

}