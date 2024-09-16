import { EventEmitter } from 'stream'
import * as manager from './manager'
import * as cm from './calc_metrics'
import * as url_handler from './url_handler'
import * as om from './output_metrics'
import * as database from './database'
import Database from 'better-sqlite3'

export class Controller extends EventEmitter {
    private manger: manager.Manager;
    private metrics: cm.Metrics;
    private outputMetrics: om.OutputMetrics;
    private urlHandler: url_handler.UrlHandler;
    constructor(manger: manager.Manager, metrics: cm.Metrics, outputMetrics: om.OutputMetrics, urlHandler: url_handler.UrlHandler) {
        super();
        this.manger = manger;
        this.metrics = metrics;
        this.outputMetrics = outputMetrics;
        this.urlHandler = urlHandler;
        this.setupListeners();
    }

    private setupListeners() {
        this.manger.on('startProcessing', (index: number) => {
            console.log(`Processing link in db at index: ${index}`);
            this.urlHandler.main(index);
        });
        
        this.metrics.on('done', (index: number) => {
            console.log(`Metrics done`);
            this.outputMetrics.output_Metrics(index);
            
        })
        this.urlHandler.on('done', (index: number) => {
            console.log('URL handling done');
            this.metrics.calc(index);
            
        })
        this.outputMetrics.on('done', (index: number) => {
            console.log(`Outputting metrics for url at index: ${index}`);
        })
        this.outputMetrics.on('close', (db: Database.Database) => {
            database.closeConnection(db);
        })
    }
}