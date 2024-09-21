import { EventEmitter } from 'stream'
import * as manager from './manager'
import * as cm from './calc_metrics'
import * as url_handler from './url_handler'
import * as om from './output_metrics'
import * as database from './database'
import Database from 'better-sqlite3'
import fs from 'fs'

/**
 * Class to set up and control the event-driven concurrency aspect of the CLI
 */
export class Controller extends EventEmitter {
    private manger: manager.Manager;
    private metrics: cm.Metrics;
    private outputMetrics: om.OutputMetrics;
    private urlHandler: url_handler.UrlHandler;
    private fp: number;
    private loglvl: number;

    constructor(manger: manager.Manager, metrics: cm.Metrics, outputMetrics: om.OutputMetrics, urlHandler: url_handler.UrlHandler, fp: number, loglvl: number) {
        /**
         * Constructor for the class
         * Runs the setupListeners() function to control the Event-driven concurrency
         * 
         * Inputs:
         * - manger: manager.Manager - Manager class created in main.ts
         * - metrics: cm.Metrics - Metrics class created in main.ts
         * - outputMetrics: om.OutputMetrics - OutputMetrics class created in main.ts
         * - urlHandler: url_handler.UrlHandler - UrlHandler class created in main.ts
         * - fp: number - logfile pointer if logging wanted to be added
         * - loglvl: number - log level set by user for specific level of logging wanted
         * 
         * Outputs:
         * - Controller class
         */
        super();
        this.manger = manger;
        this.metrics = metrics;
        this.outputMetrics = outputMetrics;
        this.urlHandler = urlHandler;
        this.fp = fp;
        this.loglvl = loglvl;
        this.setupListeners();
    }

    private setupListeners() {
        /**
         * Function that sets up the Event-driven Concurrency
         * How it works:
         *  - When one of the other class emits the phrase that matches the .on() it has, then the arrow-function is called and executed
         * 
         * Inputs: 
         * - None
         * 
         * Outputs:
         * - None
         */
        this.manger.on('startProcessing', (index: number) => {
            if(this.loglvl == 1 || this.loglvl == 2) {
                fs.writeFileSync(this.fp, `Processing link in db at index: ${index}\n`); // console.log(`Processing link in db at index: ${index}`);
            }
            this.urlHandler.main(index);
        });
        
        this.metrics.on('done', (index: number) => {
            if(this.loglvl == 1 || this.loglvl == 2)  {
                fs.writeFileSync(this.fp, `Metrics done\n`); // console.log(`Metrics done`);
            }
            this.outputMetrics.output_Metrics(index);
            
        });
        this.urlHandler.on('done', (index: number) => {
            if(this.loglvl == 1 || this.loglvl == 2)  {
                fs.writeFileSync(this.fp, `URL handling done\n`); // console.log('URL handling done');
            }
            this.metrics.calc(index);
            
        });
        this.outputMetrics.on('done', (index: number) => {
            if(this.loglvl == 1 || this.loglvl == 2)  {
                fs.writeFileSync(this.fp, `Outputting metrics for url at index: ${index}\n`); // console.log(`Outputting metrics for url at index: ${index}`);
            }
        });
        this.outputMetrics.on('close', (db: Database.Database) => {
            database.closeConnection(db, this.fp, this.loglvl);
            fs.closeSync(this.fp);
        });
    }
}