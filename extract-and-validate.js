const fs = require('fs');
const path = require('path');
const { Parser } = require('json2csv');

// Paths
const reportPath = path.join(__dirname, 'results', 'postman-report.json');
const resultsDir = path.join(__dirname, 'results');

// Read Postman CLI report
if (!fs.existsSync(reportPath)) {
    console.error('❌ postman-report.json not found!');
    process.exit(1);
}

const report = require(reportPath);

// Postman CLI v1.19 outputs an array of executions
const getRequest = report.find(r => r.requestExecuted?.name === 'GET USER USING ID');

if (!getRequest || !getRequest.response) {
    console.error('❌ No valid GET request response found.');
    process.exit(1);
}

// Convert response stream buffer to JSON
const responseData = JSON.parse(Buffer.from(getRequest.response.stream.data).toString());

// Prepare CSV data
const csvData = [
    {
        id: responseData.data.id,
        email: responseData.data.email,
        first_name: responseData.data.first_name,
        last_name: responseData.data.last_name,
        avatar: responseData.data.avatar
    }
];

// Save CSV
if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true });

const csvFileName = `${getRequest.requestExecuted.name.replace(/\s+/g, '_')}.csv`;
const csvFilePath = path.join(resultsDir, csvFileName);

const parser = new Parser({ fields: Object.keys(csvData[0]) });
const csv = parser.parse(csvData);

fs.writeFileSync(csvFilePath, csv);
console.log(`✅ Saved CSV for "${getRequest.requestExecuted.name}" at ${csvFilePath}`);

// Validate first_name in CSV matches API response
const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
const csvLines = csvContent.split('\n');
const header = csvLines[0].split(',');
const firstNameIndex = header.indexOf('first_name');

if (firstNameIndex === -1) {
    console.warn(`⚠️ first_name column not found in CSV for "${getRequest.requestExecuted.name}"`);
} else {
    const csvFirstName = csvLines[1].split(',')[firstNameIndex];
    if (csvFirstName === responseData.data.first_name) {
        console.log(`✅ Validation passed: CSV first_name matches API response (${csvFirstName})`);
    } else {
        console.error(`❌ Validation failed: CSV first_name (${csvFirstName}) does NOT match API response (${responseData.data.first_name})`);
        process.exit(1); // Fail the GitHub Action
    }
}