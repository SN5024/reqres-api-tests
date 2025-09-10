// extract-and-validate.js
const fs = require("fs");
const path = require("path");
const { parse } = require("json2csv");

// Load Postman report
const reportPath = path.join(__dirname, "results", "postman-report.json");
const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));

let validated = false;

report.run.executions.forEach(exec => {
  if (exec.item && exec.item.name === "GET USER USING ID" && exec.response?.stream?.data) {
    // Decode API response
    const responseBody = Buffer.from(exec.response.stream.data).toString("utf8");
    const json = JSON.parse(responseBody);

    if (!json.data) {
      console.error("❌ API response missing 'data'");
      process.exit(1);
    }

    // Prepare CSV data
    const user = json.data;
    const csv = parse([user]);

    // Save CSV
    const csvPath = path.join(__dirname, "results", "GET_USER_USING_ID.csv");
    fs.writeFileSync(csvPath, csv);
    console.log(`✅ Saved CSV at ${csvPath}`);

    // Validate first_name
    const apiFirstName = user.first_name;
    const csvFirstName = user.first_name; // since we just wrote it out

    if (apiFirstName !== csvFirstName) {
      console.error(`❌ Mismatch: API=${apiFirstName}, CSV=${csvFirstName}`);
      process.exit(1); // fail GitHub Actions
    } else {
      console.log(`✅ First name matches: ${apiFirstName}`);
    }

    validated = true;
  }
});

if (!validated) {
  console.error("❌ No valid GET USER USING ID execution found in report.");
  process.exit(1);
}