const reporter = require('cucumber-html-reporter');
const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const path = require('path');

const reportsDir = path.join(__dirname, 'reports');
const jsonReport = path.join(reportsDir, 'cucumber-report.json');
const extentDir = path.join(reportsDir, 'extent');
const htmlReportFile = path.join(extentDir, 'index.html');
const pdfReportFile = path.join(extentDir, 'report.pdf');

fs.ensureDirSync(extentDir);

// ---------------------
// Generate HTML Report
// ---------------------
reporter.generate({
  theme: 'bootstrap',
  jsonFile: jsonReport,
  output: htmlReportFile,
  reportSuiteAsScenarios: true,
  scenarioTimestamp: true,
  launchReport: false,
  brandTitle: "ParaBank Automation Report",
  metadata: {
    "Test Environment": "QA",
    "Platform": process.platform,
    "Executed": "Local",
    "Browser": "Playwright"
  },
  columnLayout: 2,
  storeScreenshots: true,
  screenshotsDirectory: 'screenshots',
  reportName: 'Automation Test Report',
  customData: {
    title: 'Run Info',
    data: [
      { label: 'Project', value: 'ParaBank Automation' },
      { label: 'Release', value: '1.0' },
      { label: 'Cycle', value: 'Regression' },
      { label: 'Execution Start Time', value: new Date().toLocaleString() }
    ]
  }
});

// ---------------------
// Collect Historical Data for Trend Chart
// ---------------------
const jsonFiles = fs.readdirSync(reportsDir)
  .filter(f => f.startsWith('cucumber-report') && f.endsWith('.json'));

let labels = [];
let passedData = [];
let failedData = [];
let skippedData = [];

jsonFiles.sort().forEach((file, index) => {
  const data = fs.readJsonSync(path.join(reportsDir, file));
  const summary = { passed: 0, failed: 0, skipped: 0 };
  
  data.forEach(feature => {
    feature.elements.forEach(scenario => {
      const steps = scenario.steps || [];
      steps.forEach(step => {
        if (step.result.status === 'passed') summary.passed += 1;
        if (step.result.status === 'failed') summary.failed += 1;
        if (step.result.status === 'skipped') summary.skipped += 1;
      });
    });
  });

  labels.push(`Run ${index + 1}`);
  passedData.push(summary.passed);
  failedData.push(summary.failed);
  skippedData.push(summary.skipped);
});

// ---------------------
// Append Chart.js Trend Chart
// ---------------------
const trendChartScript = `
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<div style="width: 70%; margin: auto;">
  <canvas id="trendChart"></canvas>
</div>
<script>
  const ctx = document.getElementById('trendChart').getContext('2d');
  const trendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ${JSON.stringify(labels)},
      datasets: [{
        label: 'Passed',
        data: ${JSON.stringify(passedData)},
        borderColor: 'green',
        fill: false
      },{
        label: 'Failed',
        data: ${JSON.stringify(failedData)},
        borderColor: 'red',
        fill: false
      },{
        label: 'Skipped',
        data: ${JSON.stringify(skippedData)},
        borderColor: 'orange',
        fill: false
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'top' },
        title: { display: true, text: 'Regression Test Run Trend' }
      }
    }
  });
</script>
`;

fs.appendFileSync(htmlReportFile, trendChartScript, 'utf-8');
console.log(`✅ HTML report with trend chart generated at ${htmlReportFile}`);

// ---------------------
// Generate PDF from HTML
// ---------------------
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(`file://${htmlReportFile}`, { waitUntil: 'networkidle0' });
  await page.pdf({ path: pdfReportFile, format: 'A4', printBackground: true });
  await browser.close();
  console.log(`✅ PDF report with chart generated at ${pdfReportFile}`);
})();
