import * as database from './database';
import * as sqlite3 from 'sqlite3';
import { RowInfo } from './calc_metrics';

export function outputMetrics(db: sqlite3.Database): void {
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
    db.all(`SELECT * FROM package_scores`, (err, rows) => {
        if (err) {
            console.error('Error retrieving data from the database:', err);
            // FIXME: Close the database connection on error || may change with new database implementation
            database.closeConnection(db);
            return;
        }

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

        // Close the database connection
        //FIXME: idk if i need to close
        database.closeConnection(db);
    });
}