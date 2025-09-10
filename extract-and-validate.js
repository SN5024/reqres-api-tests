const fs = require("fs");
const path = require("path");
const { parse } = require("json2csv");

// Paths
const RESULTS_DIR = path.join(__dirname, "results");
const REPORT_PATH = path.join(RESULTS_DIR, "postman-report.json");

// Ensure results directory exists
if (!fs.existsSync(RESULTS_DIR)) fs.mkdirSync(RESULTS_DIR, { recursive: true });

// Load Postman JSON report
let report;
try {
  report = require(REPORT_PATH);
} catch (err) {
  console.error(`❌ Could not load Postman report at ${REPORT_PATH}:`, err.message);
  process.exit(1);
}

// Flag to track validation success
let validationFailed = false;

// Iterate through executions
report.run.executions.forEach((exec) => {
  const requestName = exec.requestExecuted?.name || "UNKNOWN_REQUEST";

  if (!exec.response) {
    console.warn(`⚠️ No response for "${requestName}"`);
    return;
  }

  // Parse JSON response
  let jsonData;
  try {
    jsonData = JSON.parse(Buffer.from(exec.response.stream.data).toString());
  } catch (err) {
    console.warn(`⚠️ Failed to parse JSON for "${requestName}":`, err.message);
    return;
  }

  // Only handle GET USER USING ID request
  if (!jsonData.data || typeof jsonData.data !== "object") {
    console.warn(`⚠️ No 'data' object in response for "${requestName}"`);
    return;
  }

  // Convert 'data' object to CSV
  const fields = ["id", "email", "first_name", "last_name", "avatar"];
  const opts = { fields };
  let csv;
  try {
    csv = parse([jsonData.data], opts);
  } catch (err) {
    console.error(`❌ Failed to convert JSON to CSV for "${requestName}":`, err.message);
    validationFailed = true;
    return;
  }

  // Save CSV
  const csvFilePath = path.join(RESULTS_DIR, `${requestName.replace(/\s+/g, "_")}.csv`);
  fs.writeFileSync(csvFilePath, csv);
  console.log(`✅ Saved CSV for "${requestName}" at ${csvFilePath}`);

  // Validate first_name
  const csvLines = csv.split("\n");
  const headers = csvLines[0].replace(/"/g, "").split(",");
  const firstNameIndex = headers.indexOf("first_name");

  if (firstNameIndex === -1) {
    console.error(`❌ first_name column not found in CSV for "${requestName}"`);
    validationFailed = true;
    return;
  }

  const firstNameFromCsv = csvLines[1].split(",")[firstNameIndex].replace(/"/g, "");
  const firstNameFromApi = jsonData.data.first_name;

  if (firstNameFromCsv === firstNameFromApi) {
    console.log(`✅ first_name matches for "${requestName}": ${firstNameFromApi}`);
  } else {
    console.error(`❌ first_name mismatch for "${requestName}": CSV="${firstNameFromCsv}", API="${firstNameFromApi}"`);
    validationFailed = true;
  }
});

// Exit with non-zero code if any validation failed
if (validationFailed) {
  console.error("❌ Validation failed! Check above errors.");
  process.exit(1);
} else {
  console.log("✅ All validations passed!");
  process.exit(0);
}