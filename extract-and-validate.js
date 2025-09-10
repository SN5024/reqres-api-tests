// extract-and-validate.js
const fs = require("fs");
const path = require("path");
const { Parser } = require("json2csv");

const reportPath = path.join(__dirname, "results", "postman-report.json");

if (!fs.existsSync(reportPath)) {
  console.error("❌ postman-report.json not found. Did Postman run?");
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));

if (!report.run || !report.run.executions || report.run.executions.length === 0) {
  console.error("❌ No executions found in Postman report.");
  process.exit(1);
}

// Look for GET USER USING ID
const exec = report.run.executions.find(e => e.item && e.item.name === "GET USER USING ID");

if (!exec || !exec.response || !exec.response.stream) {
  console.error("❌ No valid GET request response found.");
  process.exit(1);
}

// Parse response body
const responseBody = JSON.parse(exec.response.stream.toString());
const user = responseBody.data;
if (!user) {
  console.error("❌ No `data` field in response.");
  process.exit(1);
}

// Save CSV
const csvPath = path.join(__dirname, "results", "GET_USER_USING_ID.csv");
const parser = new Parser();
const csv = parser.parse([user]);
fs.writeFileSync(csvPath, csv, "utf8");
console.log(`✅ Saved CSV for "${exec.item.name}" at ${csvPath}`);

// Validate CSV content
const csvData = fs.readFileSync(csvPath, "utf8").split("\n")[1]; // second line = first record
const csvFirstName = csvData.split(",")[1]; // assuming "id,first_name,last_name,email,..."

if (csvFirstName !== user.first_name) {
  console.error(`❌ Validation failed: API first_name="${user.first_name}" but CSV has "${csvFirstName}"`);
  process.exit(1);
}

console.log(`✅ Validation passed: first_name="${user.first_name}" matches CSV`);