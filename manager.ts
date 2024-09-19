import { EventEmitter } from 'stream';
import * as database from './database'
import { Command } from 'commander'
interface CommandAction {
    description: string,
    action: (args: string[]) => void;
}

export class Manager extends EventEmitter {
    private program: Command;
    private commands: {[key: string]: CommandAction}
    private fp: number;
    private loglvl: number;

    constructor(fp: number, loglvl: number) {
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
        this.program.help();
    }

    execute(args: string[]): void {
        this.program.parse(args);
    }

}