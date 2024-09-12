Atharva Rao
Adhvik Kannan
Noah Kim
Andrew Tu

# Compiling and Running
- `tsc <filename>.ts` to compile code into .js
- `node <filename>.js` to run code

# SQLite3
### database.ts
- Contains functions for:
    - Creating connection to database (will create it if it doesn't exist) and return that connection to you
    - Creating the table if it doesn't already exist (can call this without fear of deleting a table if it already exists)
    - Adding an entry to the database (url and db are necessary, but information and metrics are not -- Adhvik will mostly be interacting with this)
    - Updating entries in the database (url and db are necessary, but information and metrics are optional inputs)
        - Based on whoever is updating the entry (Noah/Andrew), then you will need to update the corresponding field and pass that in
        - For Noah: `updateEntry(db, url, undefined, <metrics>);`
        - For Andrew: `updateEntry(db, url, <information>, undefined);`
    - Closing connection
        - Do this at the end of your main function in order to properly disconnect from the database

# Metric Calculations:
- Bus Factor:
    - (1 - (commits by top 3 contributors) / total number of commits in the last year)
- Correctness:
    - Number of issues resolved / total number of issues
- Ramp Up: 
    - 1.0: 1.2M+ downloads
    - 0.9: 500k-1.2M downloads
    - 0.6: 50k-500k downloads
    - 0.3: 1k-50k downloads
    - 0: < 1k downloads
- Responsiveness:
    - Sum of issues weights divided by total issues in the past six months
    - Weights:
        - 1: issues closed within 3 days
        - 0.7: issues closed within 3-7 days
        - 0.4: issues closed within 7-14 days
        - 0.1: issues closed within 14-31 days
        - 0: else
- License:
    - 1: Compatible 
    - 0: Incompatible
- NetScore:
    - (Sum of (weight x metric score)) x license
    - Weights:
        - 0.4 - Responsiveness
        - 0.3 - Correctness
        - 0.1 - Bus Factor
        - 0.2 - Ramp Up

### Other Info
- `sqlite3 atharvaisanidiot.db` in the command line will let you type commands from the command line to see things in the database. Use this as a quick way to test if stuff is working
- Add any functions you want for selecting specific information, or just do it in your own code. s