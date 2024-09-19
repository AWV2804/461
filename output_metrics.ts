import * as database from './database';
import Database from 'better-sqlite3';
import { RowInfo } from './calc_metrics';
import { EventEmitter  } from 'stream';
import { fstat } from 'fs';

export class OutputMetrics extends EventEmitter {
    private _db: Database.Database;
    private fileNum: number;
    private fp: number;
    private loglvl: number

    constructor(db: Database.Database, fileNum: number, fp: number, loglvl: number) {
        super();
        this._db = db;
        this.fileNum = fileNum;
        this.fp = fp;
        this.loglvl = loglvl;
    }

    output_Metrics(index: number): void {
        try {
            const rows = this._db.prepare('SELECT * FROM package_scores WHERE id = ?').all(index);
    
            // Output each row's metrics to stdout
            if (rows && rows.length > 0) {
                rows.forEach((row: unknown) => {
                    const typedRow = row as RowInfo;
                    const metrics = JSON.parse(typedRow.metrics || '{}'); // Parse metrics if it's a JSON string
                    
                    // Format latency values to three decimal places
                    const formattedMetrics = {
                        ...metrics,
                        BusFactor_Latency: metrics.BusFactor_Latency?.toFixed(3),
                        Correctness_Latency: metrics.Correctness_Latency?.toFixed(3),
                        RampUp_Latency: metrics.RampUp_Latency?.toFixed(3),
                        ResponsiveMaintainer_Latency: metrics.ResponsiveMaintainer_Latency?.toFixed(3),
                        License_Latency: metrics.License_Latency?.toFixed(3),
                        NetScore_Latency: metrics.NetScore_Latency?.toFixed(3),
                        BusFactor: metrics.BusFactor?.toFixed(3),
                        Correctness: metrics.Correctness?.toFixed(3),
                        RampUp: metrics.RampUp?.toFixed(3),
                        ResponsiveMaintainer: metrics.ResponsiveMaintainer?.toFixed(3),
                        NetScore: metrics.NetScore?.toFixed(3),
                        
                    };
                    const output = {
                        URL: typedRow.url,
                        ...formattedMetrics
                    };
                    console.log(JSON.stringify(output));
                });
            } else {
                console.log('No data found in the database.');
            }
            this.emit('done', index);
            this.fileNum--;
            if (this.fileNum === 0) {
                this.emit('close', this._db);
            }
        } catch (err) {
            console.error('Error retrieving data from the database:', err);
            process.exit(1);
        }
    }    
}