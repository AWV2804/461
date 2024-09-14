import * as database from './database';
import Database from 'better-sqlite3';
import { RowInfo } from './calc_metrics';
import { EventEmitter  } from 'stream';

export class OutputMetrics extends EventEmitter {
    private _db: Database.Database;
    private fileNum: number;
    constructor(db: Database.Database, fileNum: number) {
        super();
        this._db = db;
        this.fileNum = fileNum;
    }

    output_Metrics(index: number): void {
        /**
         * Function to calculate metrics for all packages in the database.
         * Uses the Metrics class to calculate metrics for each package.
         * 
         * Inputs:
         * - db: sqlite3.Database - database connection
         * 
         * Outputs:
         * - None
         */
        try {
            const rows = this._db.prepare('SELECT * FROM package_scores WHERE id = ?').all(index);

            // Output each row's metrics to stdout
            if (rows && rows.length > 0) {
                rows.forEach((row: unknown) => {
                    // Use type assertion to specify that row is of type RowInfo
                    const typedRow = row as RowInfo;
                    console.log(`URL: ${typedRow.url}, Metrics: ${typedRow.metrics}`);
                });
            } else {
                console.log('No data found in the database.');
            }
            this.emit('done', index)
            this.fileNum--;
            if(this.fileNum == 0) {
                this.emit('close', this._db);
            }
        } catch (err) {
            console.error('Error retrieving data from the database:', err);
        }
    //     } finally {
    //         // Close the database connection
    //         db.close();
    //     }
    }
}