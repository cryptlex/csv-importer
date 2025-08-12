// Import required modules
import fs from 'fs';
import { parse } from 'csv-parse/sync';
import fetch from 'node-fetch';
import * as uuid from 'uuid';

const accessToken = process.env.accessToken ||  "YOUR_ACCESS_TOKEN"; // replace with your access token
const apiBaseUrl = process.env.apiBaseUrl || "https://api.cryptlex.com" // for eu use "https://api.eu.cryptlex.com"
const productId = process.env.productId || "YOUR PRODUCT_ID"; // replace with your product ID

const csvFilePath = 'licenses.csv'; // users.csv, organizations.csv, or licenses.csv

function writeLog(message) {
  console.log(message);
  fs.appendFileSync("log.txt", message + "\n");
}

function initializeLogFile() {
  if (!fs.existsSync("log.txt")) {
    fs.writeFileSync("log.txt", "Log file for importing resources to cryptlex\n");
  }
}

async function createUser( row) {
    // check whether user exists
    let users = [];
    let userBody = {};
    if (row.email && row.firstName && row.lastName) {
        userBody = {
            email: row.email,
            firstName: row.firstName,
            lastName: row.lastName,
            password: uuid.v4(), // add your logic for password generation
            roles: ['user']
        }
    }
    else {
        writeLog("user details not found in csv")
        return;
    }
    writeLog("fetching existing user...")
    // fetch user by email
    users = await getResource(`${apiBaseUrl}/users?email=${row.email}`);
    if (users.length) {
        writeLog("user already exists!")
        return users[0];
    }
    writeLog("user not found, creating new user...")
    // create a new user
    const user = await createResource(`${apiBaseUrl}/users`, userBody);
    if(user){
        writeLog("user created:", user.name);
    }
    return user;
}

async function createOrganization(row) {
    let organizations = [];
    let organizationBody = {};
    if (row.name && row.email && row.allowedUsers) {
        organizationBody = {
            name: row.name,
            email: row.email,
            allowedUsers: row.allowedUsers
        }
    }
    else {
        writeLog("organization details not found in csv")
        return;
    }
    organizations = await getResource(`${apiBaseUrl}/organizations?name=${row.name}`);
    if (organizations.length) {
        writeLog("organization already exists!")
        return organizations[0];
    }
    writeLog("organization not found, creating new organization...")
    // create a new organization
    const organization = await createResource(`${apiBaseUrl}/organizations`, organizationBody);
    if(organization){
        writeLog("organization created:", organization.name);
    }
    return organization;
}

async function createResources(rows, createResource) {
    for (let row of rows) {
        await createResource(row);
    }
}

async function createLicense(row) {
    const licenseBody = {
        key: row.key,
        allowedActivations: row.allowedActivations,
        expiresAt: row.expiresAt,
        createdAt: row.createdAt,
        subscriptionInterval: row.subscriptionInterval,
        // add more properties if needed
        productId: productId,
        metadata: []
     }
    // assuming csv contains some order_id
    if (row.order_id) {
        licenseBody.metadata.push({ key: 'order_id', value: row.order_id, visible: true });
    }

    // check for user details in csv
        writeLog("creating user...")
        const user = await createUser( row);
        if (user) {
            licenseBody.userId = user.id;
        }
    
    writeLog("creating license...")
    const license = await createResource(`${apiBaseUrl}/licenses`, licenseBody);
    if(license) {
        writeLog("license created:", license);
    }
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

async function getResource(url) {
    const response =  await  fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        }
    });
     if (response.status == 200) {
        return await response.json();
    } else {
        writeLog(response.status, await response.json());
    }
    return [];
}       


async function importCsv(filePath) {
    try {
        // read the csv file
        var csv = fs.readFileSync(filePath, 'utf8');
        const fileName = filePath.split('/').pop();
        const rows = parse(csv, { columns: true });
        initializeLogFile()
        writeLog(fileName)
        if(fileName.startsWith('organization')){
            createResources(rows, createOrganization);
        }
        else if (fileName.startsWith('user')){
            createResources(rows, createUser);
        }
        else 
            createResources(rows, createLicense);
    } catch (error) {
        writeLog(error);
    }
}

importCsv(csvFilePath);



