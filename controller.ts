import { EventEmitter } from 'stream'
import * as manager from './manager'
import * as cm from './calc_metrics'

export class Controller extends EventEmitter {
    private manger: manager.Manager;
    private metrics: cm.Metrics;
    constructor(manger: manager.Manager, metrics: cm.Metrics) {
        super();
        this.manger = manger;
        this.metrics = metrics;
        this.setupListeners();
    }

    private setupListeners() {
        this.manger.on('startProcessing', (index: number) => {
            console.log(`Processing link in db at index: ${index}`);
            this.metrics.calc(index);
        });

        this.metrics.on('done', (done: boolean) => {
            console.log(`Metrics done`);
        })
    }
}