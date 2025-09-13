const reporter = require('multiple-cucumber-html-reporter');
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const jsonReportPath = path.join(__dirname, 'reports', 'cucumber-report.json');
const htmlReportDir = path.join(__dirname, 'reports', 'extent');
const pdfReportPath = path.join(htmlReportDir, 'interactive-report.pdf');

// 1️⃣ Generate Extent Spark HTML report
reporter.generate({
    jsonDir: path.join(__dirname, 'reports'),
    reportPath: htmlReportDir,
    metadata:{
        browser: {
            name: "Playwright",
            version: "1.40"
        },
        device: "Local Machine",
        platform: {
            name: process.platform,
            version: process.version
        }
    },
    customData: {
        title: 'Execution Info',
        data: [
            {label: 'Project', value: 'ParaBank Automation'},
            {label: 'Release', value: '1.0'},
            {label: 'Execution Start Time', value: new Date().toLocaleString()},
        ]
    },
    displayDuration: true,
    durationInMS: true,
    openReportInBrowser: false,
    reportName: "Extent Spark Report",
    theme: "spark"
});

// 2️⃣ Read JSON report to generate executive summary
const rawData = fs.readFileSync(jsonReportPath);
const cucumberJson = JSON.parse(rawData);

let totalScenarios = 0, passed = 0, failed = 0;
const failingScenarios = [];

cucumberJson.forEach(feature => {
    feature.elements.forEach(scenario => {
        totalScenarios++;
        const scenarioFailed = scenario.steps.some(step => step.result.status !== 'passed');
        if (scenarioFailed) {
            failed++;
            failingScenarios.push({feature: feature.name, scenario: scenario.name});
        } else {
            passed++;
        }
    });
});

// 3️⃣ Generate interactive PDF with summary page
(async () => {
    if (!fs.existsSync(htmlReportDir)) {
        console.error('HTML report not found. Make sure it generated successfully.');
        process.exit(1);
    }

    const htmlFilePath = path.join(htmlReportDir, 'index.html');
    if (!fs.existsSync(htmlFilePath)) {
        console.error('index.html not found in report folder.');
        process.exit(1);
    }

    const browser = await chromium.launch();
    const page = await browser.newPage();

    // Inject executive summary as first page
    const summaryHtml = `
        <html>
        <head>
            <title>Executive Summary</title>
            <style>
                body { font-family: Arial; padding: 20px; }
                h1 { color: #2e6c80; }
                table { border-collapse: collapse; width: 100%; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
            </style>
        </head>
        <body>
            <h1>Executive Summary</h1>
            <p><strong>Total Scenarios:</strong> ${totalScenarios}</p>
            <p><strong>Passed:</strong> ${passed}</p>
            <p><strong>Failed:</strong> ${failed}</p>

            ${failingScenarios.length ? `<h2>Top Failing Scenarios</h2>
            <table>
                <tr><th>Feature</th><th>Scenario</th></tr>
                ${failingScenarios.map(f => `<tr><td>${f.feature}</td><td>${f.scenario}</td></tr>`).join('')}
            </table>` : ''}

            <p><em>Report generated on ${new Date().toLocaleString()}</em></p>
            <hr>
        </body>
        </html>
    `;

    // Combine summary with Spark HTML report
    const tempSummaryFile = path.join(htmlReportDir, 'summary.html');
    fs.writeFileSync(tempSummaryFile, summaryHtml, 'utf8');

    // Navigate summary page first
    await page.goto(`file://${tempSummaryFile}`, { waitUntil: 'networkidle' });

    // Append the Spark HTML report as a second page in PDF
    const sparkPage = await browser.newPage();
    await sparkPage.goto(`file://${htmlFilePath}`, { waitUntil: 'networkidle' });

    // Combine both pages into a single PDF
    const summaryPdf = await page.pdf({ format: 'A4', printBackground: true });
    const sparkPdf = await sparkPage.pdf({ format: 'A4', printBackground: true });

    // Merge PDFs using pdf-lib
    const { PDFDocument } = require('pdf-lib');
    const mergedPdf = await PDFDocument.create();

    const summaryDoc = await PDFDocument.load(summaryPdf);
    const sparkDoc = await PDFDocument.load(sparkPdf);

    const copiedSummaryPages = await mergedPdf.copyPages(summaryDoc, summaryDoc.getPageIndices());
    copiedSummaryPages.forEach(page => mergedPdf.addPage(page));

    const copiedSparkPages = await mergedPdf.copyPages(sparkDoc, sparkDoc.getPageIndices());
    copiedSparkPages.forEach(page => mergedPdf.addPage(page));

    const pdfBytes = await mergedPdf.save();
    fs.writeFileSync(pdfReportPath, pdfBytes);

    await browser.close();
    console.log(`✅ Interactive PDF with executive summary generated at: ${pdfReportPath}`);
})();
