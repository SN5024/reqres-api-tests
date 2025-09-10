const fs = require("fs");
const path = require("path");
const { parse } = require("json2csv");

// Paths
const reportPath = path.join(__dirname, "results", "postman-report.json");
const resultsDir = path.join(__dirname, "results");

// Ensure results directory exists
if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true });

// Load Postman JSON report
let report;
try {
  report = require(reportPath);
} catch (err) {
  console.error("❌ Could not load Postman report:", err.message);
  process.exit(1);
}

let validationFailed = false;

// Iterate through executions
report.run.executions.forEach((exec) => {
  if (!exec.response) {
    console.warn(`⚠️ No response for "${exec.requestExecuted.name}"`);
    validationFailed = true;
    return;
  }

  // Parse JSON response
  let jsonData;
  try {
    jsonData = JSON.parse(Buffer.from(exec.response.stream.data).toString());
  } catch (err) {
    console.warn(`⚠️ Failed to parse JSON for "${exec.requestExecuted.name}"`);
    validationFailed = true;
    return;
  }

  // Ensure 'data' exists
  if (!jsonData.data) {
    console.warn(`⚠️ No 'data' object in response for "${exec.requestExecuted.name}"`);
    validationFailed = true;
    return;
  }

  // Convert nested 'data' object to CSV
  const fields = ["id", "email", "first_name", "last_name", "avatar"];
  const opts = { fields };
  let csv;
  try {
    csv = parse([jsonData.data], opts);
  } catch (err) {
    console.error(`❌ Failed to convert JSON to CSV for "${exec.requestExecuted.name}"`);
    validationFailed = true;
    return;
  }

  // Save CSV
  const csvFilePath = path.join(resultsDir, `${exec.requestExecuted.name.replace(/\s+/g, "_")}.csv`);
  fs.writeFileSync(csvFilePath, csv);
  console.log(`✅ Saved CSV for "${exec.requestExecuted.name}" at ${csvFilePath}`);

  // Validate first_name against CSV
  const csvLines = csv.split("\n");
  const headers = csvLines[0].replace(/"/g, "").split(",");
  const firstNameIndex = headers.indexOf("first_name");

  if (firstNameIndex === -1) {
    console.warn(`⚠️ first_name column not found in CSV for "${exec.requestExecuted.name}"`);
    validationFailed = true;
    return;
  }

  const firstNameFromCsv = csvLines[1].split(",")[firstNameIndex].replace(/"/g, "");
  const firstNameFromApi = jsonData.data.first_name;

  if (firstNameFromCsv === firstNameFromApi) {
    console.log(`✅ first_name matches for "${exec.requestExecuted.name}": ${firstNameFromApi}`);
  } else {
    console.error(`❌ first_name mismatch for "${exec.requestExecuted.name}": CSV="${firstNameFromCsv}", API="${firstNameFromApi}"`);
    validationFailed = true;
  }
});

if (validationFailed) {
  console.error("❌ Validation failed. Exiting with code 1.");
  process.exit(1);
} else {
  console.log("✅ All validations passed.");
}