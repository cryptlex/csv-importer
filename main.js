const fs = require('fs');
const parse = require('csv-parse/lib/sync')
const fetch = require('node-fetch')

const accessToken = 'process.env.ACCESS_TOKEN'
const apiBaseUrl = "https://api.cryptlex.com/v3";
const productId = 'PASTE_YOUR_PRODUCT_ID';

const csvFilePath = 'sample.csv';

async function importCsv(filePath) {

    try {
        // read the csv file
        var csv = fs.readFileSync(filePath, 'utf8');
        // parse the csv file
        const licenses = parse(csv, { columns: true });
        for (let license of licenses) {
            // set the productId
            license.productId = productId;
            license.metadata = [];
            
            // assuming csv contains some order_id
            if (license.order_id) {
                license.metadata.push({ key: 'order_id', value: license.order_id, visible: false });
            }

            const response = await fetch(`${apiBaseUrl}/licenses`, {
                method: 'POST',
                body: JSON.stringify(license),
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                }
            });
            if (response.status == 201) {
                console.log("license created!", license.key)
            } else {
                console.log("license creation failed!")
                console.log(response.status, license, await response.json());
            }
        }
    } catch (error) {
        console.log(error);
    }
}

importCsv(csvFilePath);



