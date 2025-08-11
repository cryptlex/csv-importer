// Import required modules
import fs from 'fs';
import { parse } from 'csv-parse/sync';
import fetch from 'node-fetch';
import * as uuid from 'uuid';

const accessToken = process.env.accessToken ||  "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzY29wZSI6WyJsaWNlbnNlOnJlYWQiLCJsaWNlbnNlOndyaXRlIiwib3JnYW5pemF0aW9uOnJlYWQiLCJvcmdhbml6YXRpb246d3JpdGUiLCJ1c2VyOnJlYWQiLCJ1c2VyOndyaXRlIl0sInN1YiI6ImViODI2NTJlLTZiOGItNDg0Ny1iYzg5LTI4MDM5NTRjZjQyMCIsImVtYWlsIjoibXVtaW4ua2hhbkBjcnlwdGxleC5jb20iLCJqdGkiOiIwMTk4OTdmOS01NThkLTdhMTQtYTVkMi1kOWZmMmVkZGVmNjciLCJpYXQiOjE3NTQ4OTYzNTYsInRva2VuX3VzYWdlIjoicGVyc29uYWxfYWNjZXNzX3Rva2VuIiwidGVuYW50aWQiOiIwMTk4MzA1My00NDg5LTczNmQtOWU3Zi0wY2JhMjA0ZDFhZTgiLCJleHAiOjE3NTY0MDU3OTksImF1ZCI6Imh0dHBzOi8vYXBpLmRldi5jcnlwdGxleC5jb20ifQ.F6ev6_prY8wWNvf8tVvdHy3J9mu5rDjGLct7adMmHYPV-X04MgYOVjo16DZUqEKWRmkA-z4AlBoVcDL6v-KvzsVvdfaLKiZXQQP_taSH61tMYg7Pu3efKuyvpP8kB9fHkf38Dwq_MGv4wQREQkdW2VNuyNwWPuguq9Qm-ywsdVTFr0KyLMs0EOz6fi4SPvrWQGUPPh12DTuTm_Xr-SLtvolhNlV7RPKnMzhEnW6o04CqLURaRYm_WRq-7mQfHPvFuu1JSzbB6ZjhkEuhLXmEV4TsGpclTYptzxEseTtqDrQ8v5GS_soJy9NYeRUMtKIumtpKL3adU58kDwvFKFXIGQ"; // replace with your Cryptlex access token with license:read, license:write, user:read, user:write, organization:read, organization:write permissions
const apiBaseUrl = process.env.apiBaseUrl || "https://api.dev.cryptlex.com/v3"; // for EU, use "https://api.eu.cryptlex.com/v3"
const productId = process.env.productId || "01983053-f234-753d-ab96-b4f0d91c1514"; // replace with your product ID

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
        initializeLogFile
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



