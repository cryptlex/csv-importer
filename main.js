const fs = require('fs');
const parse = require('csv-parse/lib/sync')
const fetch = require('node-fetch')

const accessToken = 'process.env.ACCESS_TOKEN'
const apiBaseUrl = "https://api.cryptlex.com/v3";
const productId = 'PASTE_YOUR_PRODUCT_ID';

const csvFilePath = 'sample.csv';

async function createResource(url, resource) {
    const response = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(resource),
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        }
    });
    if (response.status == 201) {
        return await response.json();
    } else {
        console.error(response.status, resource, await response.json());
    }
}

async function importCsv(filePath) {
    try {
        // read the csv file
        var csv = fs.readFileSync(filePath, 'utf8');
        // parse the csv file
        const rows = parse(csv, { columns: true });
        for (let row of rows) {
            // set the productId
            const licenseBody = {
                key: row.key,
                allowedActivations: row.allowedActivations,
                validity: row.validity,
                createdAt: row.createdAt,
                // add more properties if needed
                productId: productId,
                metadata: []
            }
            // assuming csv contains some order_id
            if (row.order_id) {
                licenseBody.metadata.push({ key: 'order_id', value: row.order_id, visible: false });
            }

            // check for user details in csv
            if (row.email && row.firstName && row.lastName) {
                const userBody = {
                    email: row.email,
                    firstName: row.firstName,
                    lastName: row.lastName,
                    password: 'top_secret', // add your logic for password generation
                    roles: ['user']
                }
                console.log("creating user...")
                const user = await createResource(`${apiBaseUrl}/users`, userBody);
                if (user) {
                    console.log("user created:", user.name);
                    licenseBody.userId = user.id;
                }
            }
            console.log("creating license...")
            const license = await createResource(`${apiBaseUrl}/licenses`, licenseBody);
            if(license) {
                console.log("license created:", license.key);
            }
        }
    } catch (error) {
        console.log(error);
    }
}

importCsv(csvFilePath);



