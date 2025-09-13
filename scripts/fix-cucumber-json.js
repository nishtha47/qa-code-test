const fs = require("fs");
const path = require("path");

const reportFile = path.join(__dirname, "../reports/cucumber-report.json");
let json = fs.readFileSync(reportFile, "utf-8");

// replace all backslashes with forward slashes
json = json.replace(/\\\\/g, "/");

fs.writeFileSync(reportFile, json, "utf-8");
console.log("✅ cucumber.json sanitized (Windows paths fixed)");
