const path = require('path');
const fs = require('fs');
const reporter = require('multiple-cucumber-html-reporter');
const pdf = require('html-pdf');

const jsonReportDir = path.join(__dirname, '../reports'); // JSON files
const htmlReportDir = path.join(jsonReportDir, 'html-report');
const htmlReportFile = path.join(htmlReportDir, 'index.html');
const pdfReportFile = path.join(jsonReportDir, 'pdf', 'Parabank-Test-Report.pdf');

// -------------------- Generate Spark HTML Report --------------------
reporter.generate({
    jsonDir: jsonReportDir,
    reportPath: htmlReportDir,
    displayDuration: true,
    reportName: 'Parabank Test Report',
    openReportInBrowser: false,
    metadata: {
        browser: { name: 'chrome', version: '115' },
        device: 'Local Test Machine',
        platform: { name: process.platform, version: process.version }
    }
});

console.log(`✅ HTML report generated at: ${htmlReportDir}`);

// -------------------- Convert HTML to PDF --------------------
setTimeout(() => {
    if (fs.existsSync(htmlReportFile)) {
        const htmlContent = fs.readFileSync(htmlReportFile, 'utf8');
        pdf.create(htmlContent, { format: 'A4', border: '10mm' }).toFile(pdfReportFile, (err, res) => {
            if (err) {
                console.error('❌ Error generating PDF report:', err);
            } else {
                console.log(`✅ PDF report generated at: ${pdfReportFile}`);
            }
        });
    } else {
        console.error('❌ HTML report not found. Cannot generate PDF.');
    }
}, 3000);
