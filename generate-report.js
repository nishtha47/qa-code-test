const fs = require('fs');
const path = require('path');
const { ReportAggregator, HtmlReporter } = require('wdio-html-nice-reporter'); // Example Extent-like reporter

// Paths
const cucumberJsonPath = path.join(__dirname, 'reports', 'combined-cucumber-report.json');
const extentReportDir = path.join(__dirname, 'reports', 'extent');

// Ensure output directory exists
if (!fs.existsSync(extentReportDir)) {
    fs.mkdirSync(extentReportDir, { recursive: true });
}

// Check if Cucumber JSON exists
if (!fs.existsSync(cucumberJsonPath)) {
    console.error(`❌ Cucumber JSON report not found at ${cucumberJsonPath}`);
    process.exit(1);
}

// Load JSON
const cucumberData = JSON.parse(fs.readFileSync(cucumberJsonPath, 'utf-8'));

// Initialize report aggregator
const reportAggregator = new ReportAggregator({
    outputDir: extentReportDir,
    filename: 'index.html',
    reportTitle: 'Parabank Automation Extent Spark Report',
    browserName: 'N/A',
    collapseTests: true,
    displayDuration: true,
});

// Add JSON data to report
reportAggregator.createReport(cucumberData)
    .then(() => {
        console.log(`✅ Extent Spark report generated at ${path.join(extentReportDir, 'index.html')}`);
    })
    .catch((err) => {
        console.error('❌ Failed to generate Extent report:', err);
        process.exit(1);
    });
