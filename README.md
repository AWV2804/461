Atharva Rao
Adhvik Kannan
Noah Kim
Andrew Tu

# Program Purpose
- The purpose of this program is to provide ACME Corp. with a reliable and safe package analyzer
# Configuration and Invocation
- `./run install` to configure the program
    - log_lvl defaults to 0
    - program will crash without proper configuration of GitHub Token and Log File in either the .env file or the command line bash EXPORT
-  `./run ${PATH-TO-DEPENDENCY-FILE}` to invoke the program

# Better-SQLite3
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

# Url Handling
### url_handler.ts
- Contains the UrlHandler class, which is responsible for processing URLs and fetching data from Github and npm

- Key Features
    - Url Parsing: Determines if provided URL is a github repository or an npm package. If it is an npm package, fetches the associated Github repository URL from the npm registry

    - Data Fetching: Retrieves repository info such as number of commits in the past year, top 3 contributers and their commits, total number of issues opened and closed in the past year etc.

    - Metrics Storage: Stores all fetched data in a map (commitsMap) for later use in metric calculations

    - Database Interaction: Updates the database entry with the fetched metrics by calling database.updateEntry

- Notes
    - ensure you have a github personal access token set in your environment variables as GITHUB_TOKEN for API requests. This token should have permissions to read repository data.

    - Be aware of github and npm api rate limits when making requests. Realistically this shouldn't be an issue

    - The checkLicense method clones repositories to a temporary directory to check for license files. Make sure your environment allows for file system operations and cleanup as needed

    - In most cases of an error, the process will exit. This is most likely because the link is not an npm package but instead something else
# Metric Calculations:
- Bus Factor:
    - (1 - (commits by top 3 contributors) / total number of commits in the last year)
- Correctness:
    - Number of issues resolved in the past  year / total number of issues in the past year
- Ramp Up: 
    - 1.0: 1.2M+ downloads
    - 0.9: 500k-1.2M downloads
    - 0.6: 50k-500k downloads
    - 0.3: 1k-50k downloads
    - 0: < 1k downloads
- Responsiveness:
    - Sum of issues weights divided by total issues in the past year
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
- `sqlite3 metrics.db` in the command line will let you type commands from the command line to see things in the database. Use this as a quick way to test if stuff is working
- Add any functions you want for selecting specific information, or just do it in your own code. s