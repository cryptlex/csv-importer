const fs = require('fs');
const uuid = require('uuid');
const parse = require('csv-parse/lib/sync')
const fetch = require('node-fetch')

const accessToken = 'process.env.ACCESS_TOKEN'
const apiBaseUrl = "https://api.cryptlex.com/v3";
const productId = 'PASTE_YOUR_PRODUCT_ID';

const csvFilePath = 'sample.csv';

async function createUser(url, resource) {
    // check whether user exists
    let users = [];
    console.log("fetching existing user...");
    const response = await fetch(`${url}?email=${resource.email}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        }
    });
    if (response.status == 200) {
        users = await response.json();
    } else {
        console.error(response.status, resource, await response.json());
    }
    if (users.length) {
        console.log("user already exists!")
        return users[0];
    }
    console.log("user not found, creating new user...")
    // create a new user
    const user = await createResource(url, resource);
    if(user){
        console.log("user created:", user.name);
    }
    return user;
}

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
                licenseBody.metadata.push({ key: 'order_id', value: row.order_id, visible: true });
            }

            // check for user details in csv
            if (row.email && row.firstName && row.lastName) {
                const userBody = {
                    email: row.email,
                    firstName: row.firstName,
                    lastName: row.lastName,
                    password: uuid.v4(), // add your logic for password generation
                    roles: ['user']
                }
                console.log("creating user...")
                const user = await createUser(`${apiBaseUrl}/users`, userBody);
                if (user) {
                    licenseBody.userId = user.id;
                }
            }
            console.log("creating license...")
            const license = await createResource(`${apiBaseUrl}/licenses`, licenseBody);
            if(license) {
                console.log("license created:", license);
            }
        }
    } catch (error) {
        console.log(error);
    }
}

importCsv(csvFilePath);



