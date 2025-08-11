# csv-importer
A Node.js utility to import CSV data (users, organizations, and licenses) to cryptlex.

## Features
- Imports data from CSV files
- Creates users, organizations, and licenses based on CSV content
- Handles duplicate checks for organizations
- Supports metadata for licenses
- Logs operations to a file

## Prerequisites
- Node.js installed
- Access token for API authentication
- CSV files with appropriate data structure

## CSV File Requirements

### Organization CSV
- Must include:
  - name
  - email
  - allowedUsers

### User CSV
- Must include:
  - firstName
  - lastName
  - email

### License CSV
- Must include:
  - key
- Optional:
  - allowedActivations
  - expiresAt
  - createdAt
  - subscriptionInterval
  - order_id (will be added as metadata)

## Usage

1. Configure the following variables :
   - `ACCESS_TOKEN`: Your Cryptlex API access token
   - `API_BASE_URL`: The Cryptlex API base URL
   - `PRODUCT_ID`: The ID of the product to associate licenses with

2. Prepare your CSV file with the required fields
3. npm i
4. Run the importer:
   ```
   node main.js path/to/your/csv
   ```

The script will automatically detect the type of resource to create based on the CSV filename:
- Files starting with 'organization' will create organizations
- Files starting with 'user' will create users
- All other files will be treated as license imports

## Logging
Operations are logged to a file for tracking and debugging purposes.
