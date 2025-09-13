const { Before, After, BeforeAll, AfterAll } = require('@cucumber/cucumber');
const path = require('path');
const fs = require('fs');
const reporter = require('multiple-cucumber-html-reporter');
const pdf = require('html-pdf');

let testStartTime;

// -------------------- BEFORE ALL --------------------
BeforeAll(async function () {
    testStartTime = new Date();
    console.log('🚀 Test execution started...');
});

// -------------------- AFTER EACH SCENARIO --------------------
After(async function (scenario) {
    // Only capture screenshot for UI tests if scenario failed
    if (scenario.result.status === 'FAILED' && this.page) {
        const screenshotPath = path.join(
            __dirname,
            '../../reports/screenshots',
            `failed-${scenario.pickle.name.replace(/\s+/g, '_')}-${Date.now()}.png`
        );

        const screenshot = await this.page.screenshot({ path: screenshotPath, fullPage: true });
        this.attach(screenshot, 'image/png');
        console.log(`📸 Screenshot saved: ${screenshotPath}`);
    }
});

// -------------------- AFTER ALL --------------------
AfterAll(async function () {
    const testEndTime = new Date();
    const duration = (testEndTime - testStartTime) / 1000;
    console.log(`⏱️ Total execution time: ${duration} seconds`);

    const jsonReportDir = path.join(__dirname, '../../reports'); // where cucumber JSON reports are saved
    const htmlReportPath = path.join(jsonReportDir, 'html-report');
    const htmlReportFile = path.join(htmlReportPath, 'index.html');
    const pdfReportPath = path.join(jsonReportDir, 'pdf');
    const pdfReportFile = path.join(pdfReportPath, 'Cucumber-Test-Report.pdf');

    try {
        // Ensure directories exist
        fs.mkdirSync(pdfReportPath, { recursive: true });

        // -------------------- Generate HTML Report --------------------
        reporter.generate({
            jsonDir: jsonReportDir,
            reportPath: htmlReportPath,
            displayDuration: true,
            reportName: 'Cucumber Test Report',
            openReportInBrowser: false, // disable auto-opening, we’ll log path
            metadata: {
                browser: { name: 'chrome', version: '115' },
                device: 'Local Test Machine',
                platform: { name: process.platform, version: process.version }
            }
        });
        console.log(`✅ HTML report generated at: ${htmlReportFile}`);

        // -------------------- Convert HTML Report to PDF --------------------
        setTimeout(() => {
            if (fs.existsSync(htmlReportFile)) {
                const htmlContent = fs.readFileSync(htmlReportFile, 'utf8');
                pdf.create(htmlContent, { format: 'A4', border: '10mm' }).toFile(pdfReportFile, (err) => {
                    if (err) {
                        console.error('❌ Error generating PDF report:', err);
                    } else {
                        console.log(`✅ PDF report generated at: ${pdfReportFile}`);
                    }
                });
            } else {
                console.error('❌ HTML report not found. Cannot generate PDF.');
            }
        }, 2000);
    } catch (err) {
        console.error('❌ Error generating reports:', err);
    }
});
