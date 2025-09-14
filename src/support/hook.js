// src/support/hooks.js
const { Before, After, BeforeAll, AfterAll } = require('@cucumber/cucumber');
const path = require('path');
const fs = require('fs');
const reporter = require('multiple-cucumber-html-reporter');
const pdf = require('html-pdf');

let testStartTime;
let totalScenarios = 0;
let passedScenarios = 0;
let failedScenarios = 0;

// -------------------- BEFORE ALL --------------------
BeforeAll(async function () {
    testStartTime = new Date();
    console.log('🚀 Test execution started...');
    console.log(`📅 Start time: ${testStartTime.toISOString()}`);

    // Create required directories
    const directories = [
        'reports',
        'reports/screenshots',
        'reports/html-report',
        'reports/pdf',
        'screenshots'
    ];

    directories.forEach(dir => {
        const fullPath = path.join(__dirname, '../../', dir);
        if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
    });

    // Reset counters
    totalScenarios = 0;
    passedScenarios = 0;
    failedScenarios = 0;
});

// -------------------- BEFORE EACH SCENARIO --------------------
Before(async function (scenario) {
    totalScenarios++;
    console.log(`\n=== 🎬 Starting Scenario ${totalScenarios}: ${scenario.pickle.name} ===`);

    this.currentScenario = scenario;
    this.scenarioStartTime = new Date();

    // Initialize browser only for UI scenarios
    if (scenario.pickle.tags.some(tag => tag.name === '@ui')) {
        console.log('🌐 Initializing browser for UI scenario...');
        try {
            await this.initBrowser();

            if (this.page) {
                this.page.setDefaultTimeout(45000);
                this.page.setDefaultNavigationTimeout(45000);

                this.page.on('console', msg => {
                    if (msg.type() === 'error') console.log(`🔴 Browser Console Error: ${msg.text()}`);
                });

                this.page.on('pageerror', error => {
                    console.log(`🔴 Page Error: ${error.message}`);
                });
            }

        } catch (error) {
            console.error('❌ Failed to initialize browser:', error);
            await this.handleError(error, 'Browser Initialization');
            throw error;
        }
    } else {
        console.log('⚡ API scenario detected, skipping browser initialization');
    }
});

// -------------------- AFTER EACH SCENARIO --------------------
After(async function (scenario) {
    const scenarioEndTime = new Date();
    const scenarioDuration = (scenarioEndTime - this.scenarioStartTime) / 1000;

    console.log(`\n=== 🏁 Scenario Result: ${scenario.result.status} ===`);
    console.log(`⏱️ Duration: ${scenarioDuration} seconds`);

    if (scenario.result.status === 'PASSED') passedScenarios++;
    else if (scenario.result.status === 'FAILED') failedScenarios++;

    // Handle UI failures
    if (scenario.result.status === 'FAILED' && this.page) {
        const screenshotDir = path.join(__dirname, '../../reports/screenshots');
        fs.mkdirSync(screenshotDir, { recursive: true });
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const scenarioName = scenario.pickle.name.replace(/[^a-zA-Z0-9]/g, '_');

        try {
            // Full page screenshot
            const screenshotPath = path.join(screenshotDir, `failed-${scenarioName}-${timestamp}.png`);
            const screenshot = await this.page.screenshot({ path: screenshotPath, fullPage: true, timeout: 10000 });
            if (this.attach) await this.attach(screenshot, 'image/png');

            // JSON debug info
            const debugInfo = {
                scenarioName: scenario.pickle.name,
                status: scenario.result.status,
                error: scenario.result.message || 'No error message available',
                url: await this.page.url(),
                timestamp: scenarioEndTime.toISOString(),
                duration: `${scenarioDuration} seconds`,
                testData: this.testData || {},
                browserInfo: {
                    userAgent: await this.page.evaluate(() => navigator.userAgent),
                    viewport: await this.page.viewportSize()
                }
            };
            const debugInfoPath = path.join(screenshotDir, `debug-${scenarioName}-${timestamp}.json`);
            fs.writeFileSync(debugInfoPath, JSON.stringify(debugInfo, null, 2));
            if (this.attach) await this.attach(JSON.stringify(debugInfo, null, 2), 'application/json');

            // Page source
            const sourceFile = path.join(screenshotDir, `source-${scenarioName}-${timestamp}.html`);
            fs.writeFileSync(sourceFile, await this.page.content());

        } catch (error) {
            console.error('❌ Error capturing UI failure info:', error);
        }

    } else if (scenario.result.status === 'FAILED') {
        // API failure
        if (this.attach) {
            const debugInfo = {
                scenarioName: scenario.pickle.name,
                status: scenario.result.status,
                error: scenario.result.message || 'No error message available',
                timestamp: scenarioEndTime.toISOString(),
                testData: this.testData || {},
                apiResponse: this.apiResponse || {}
            };
            await this.attach(JSON.stringify(debugInfo, null, 2), 'application/json');
        }
    }

    // Close browser if open
    if (this.browser) {
        try {
            await this.closeBrowser();
        } catch (cleanupError) {
            console.error('⚠️ Error during browser cleanup:', cleanupError.message);
        }
    }
});

// -------------------- AFTER ALL --------------------
AfterAll(async function () {
    const testEndTime = new Date();
    const totalDuration = (testEndTime - testStartTime) / 1000;

    console.log('\n🏆 === TEST EXECUTION SUMMARY ===');
    console.log(`📅 Start: ${testStartTime.toISOString()}`);
    console.log(`📅 End: ${testEndTime.toISOString()}`);
    console.log(`⏱️ Total time: ${totalDuration} seconds`);
    console.log(`📊 Total scenarios: ${totalScenarios}`);
    console.log(`✅ Passed: ${passedScenarios}`);
    console.log(`❌ Failed: ${failedScenarios}`);
    console.log(`📈 Success rate: ${totalScenarios > 0 ? ((passedScenarios / totalScenarios) * 100).toFixed(2) : 0}%`);

    const jsonReportDir = path.join(__dirname, '../../reports');
    const htmlReportPath = path.join(jsonReportDir, 'html-report');
    const htmlReportFile = path.join(htmlReportPath, 'index.html');
    const pdfReportPath = path.join(jsonReportDir, 'pdf');
    const pdfReportFile = path.join(pdfReportPath, 'Cucumber-Test-Report.pdf');

    fs.mkdirSync(pdfReportPath, { recursive: true });

    try {
        reporter.generate({
            jsonDir: jsonReportDir,
            reportPath: htmlReportPath,
            displayDuration: true,
            displayReportTime: true,
            reportName: 'Parabank Cucumber Test Report',
            pageTitle: 'Parabank Test Results',
            openReportInBrowser: false,
            customData: {
                title: 'Test Execution Summary',
                data: [
                    { label: 'Project', value: 'Parabank Banking Application' },
                    { label: 'Environment', value: 'Test Environment' },
                    { label: 'Execution Start', value: testStartTime.toLocaleString() },
                    { label: 'Execution End', value: testEndTime.toLocaleString() },
                    { label: 'Total Duration', value: `${totalDuration} seconds` },
                    { label: 'Total Scenarios', value: totalScenarios },
                    { label: 'Success Rate', value: `${totalScenarios > 0 ? ((passedScenarios / totalScenarios) * 100).toFixed(2) : 0}%` }
                ]
            },
            metadata: {
                browser: { name: 'chromium', version: 'Latest' },
                device: 'Local Test Machine',
                platform: { name: process.platform, version: process.version },
                execution: {
                    startTime: testStartTime.toISOString(),
                    endTime: testEndTime.toISOString(),
                    duration: `${totalDuration} seconds`,
                    totalScenarios,
                    passed: passedScenarios,
                    failed: failedScenarios,
                    successRate: `${totalScenarios > 0 ? ((passedScenarios / totalScenarios) * 100).toFixed(2) : 0}%`
                }
            }
        });
        console.log(`✅ HTML report generated at: ${htmlReportFile}`);

        setTimeout(() => {
            if (fs.existsSync(htmlReportFile)) {
                const htmlContent = fs.readFileSync(htmlReportFile, 'utf8');
                pdf.create(htmlContent, { format: 'A4', orientation: 'portrait', border: '10mm', timeout: 30000 }).toFile(pdfReportFile, (err) => {
                    if (err) console.error('❌ Error generating PDF:', err);
                    else console.log(`✅ PDF report generated at: ${pdfReportFile}`);
                });
            }
        }, 3000);

    } catch (reportError) {
        console.error('❌ Error generating reports:', reportError);
    }

    console.log('\n🔧 === FINAL CLEANUP ===');
    console.log(`📂 Generated files:\n   HTML: ${htmlReportFile}\n   PDF: ${pdfReportFile}\n   Screenshots: ${path.join(__dirname, '../../reports/screenshots')}`);
    if (failedScenarios > 0) console.log(`⚠️ ${failedScenarios} scenario(s) failed`);
    else console.log('🎉 All scenarios passed successfully!');
});
