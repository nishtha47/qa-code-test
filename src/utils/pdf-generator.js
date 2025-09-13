const fs = require('fs');
const path = require('path');
const pdf = require('html-pdf');

class PDFGenerator {
    constructor() {
        this.pdfDir = './reports/pdf';
        this.ensureDirectories();
    }

    ensureDirectories() {
        if (!fs.existsSync(this.pdfDir)) {
            fs.mkdirSync(this.pdfDir, { recursive: true });
        }
    }

    async generatePDFFromHTML(htmlFilePath) {
        return new Promise((resolve, reject) => {
            const htmlContent = fs.readFileSync(htmlFilePath, 'utf8');
            
            const options = {
                format: 'A4',
                orientation: 'portrait',
                border: {
                    top: '0.5in',
                    right: '0.5in',
                    bottom: '0.5in',
                    left: '0.5in'
                },
                header: {
                    height: '20mm',
                    contents: `
                        <div style="text-align: center; font-size: 12px; color: #666;">
                            Parabank Test Automation Report - ${new Date().toLocaleDateString()}
                        </div>
                    `
                },
                footer: {
                    height: '15mm',
                    contents: {
                        default: '<div style="text-align: center; font-size: 10px; color: #666;">{{page}}/{{pages}}</div>'
                    }
                },
                childProcessOptions: {
                    env: {
                        OPENSSL_CONF: '/dev/null',
                    },
                },
                phantomArgs: ['--ignore-ssl-errors=yes'],
                timeout: 30000
            };

            const pdfPath = path.join(this.pdfDir, `parabank-report-${Date.now()}.pdf`);
            
            pdf.create(htmlContent, options).toFile(pdfPath, (err, res) => {
                if (err) {
                    console.error('❌ PDF Generation Error:', err);
                    reject(err);
                } else {
                    console.log('📄 PDF Generated Successfully!');
                    console.log(`📁 PDF Location: ${pdfPath}`);
                    resolve(pdfPath);
                }
            });
        });
    }

    createCustomHTML(testResults) {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Parabank Test Report - Spark Style</title>
            <style>
                body {
                    font-family: 'Segoe UI', Arial, sans-serif;
                    margin: 0;
                    padding: 20px;
                    background: #f8f9fa;
                }
                .header {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 30px;
                    text-align: center;
                    border-radius: 10px;
                    margin-bottom: 30px;
                }
                .stats-container {
                    display: flex;
                    justify-content: space-around;
                    margin: 30px 0;
                }
                .stat-card {
                    background: white;
                    padding: 20px;
                    border-radius: 8px;
                    text-align: center;
                    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                    min-width: 120px;
                }
                .stat-pass { border-left: 5px solid #28a745; }
                .stat-fail { border-left: 5px solid #dc3545; }
                .stat-skip { border-left: 5px solid #ffc107; }
                .stat-number { font-size: 36px; font-weight: bold; margin: 10px 0; }
                .test-details {
                    background: white;
                    padding: 20px;
                    border-radius: 8px;
                    margin: 20px 0;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                .feature-title {
                    background: #667eea;
                    color: white;
                    padding: 10px 15px;
                    border-radius: 5px;
                    margin: 15px 0 10px 0;
                }
                .scenario-item {
                    padding: 10px;
                    margin: 5px 0;
                    border-left: 3px solid #ddd;
                    background: #f8f9fa;
                }
                .scenario-pass { border-left-color: #28a745; }
                .scenario-fail { border-left-color: #dc3545; }
                .footer {
                    text-align: center;
                    margin-top: 40px;
                    color: #666;
                    font-size: 12px;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🚀 Parabank Test Automation Report</h1>
                <h3>Spark Style Dashboard</h3>
                <p>Generated on ${new Date().toLocaleString()}</p>
            </div>

            <div class="stats-container">
                <div class="stat-card stat-pass">
                    <div class="stat-number" id="pass-count">0</div>
                    <div>Passed</div>
                </div>
                <div class="stat-card stat-fail">
                    <div class="stat-number" id="fail-count">0</div>
                    <div>Failed</div>
                </div>
                <div class="stat-card stat-skip">
                    <div class="stat-number" id="skip-count">0</div>
                    <div>Skipped</div>
                </div>
            </div>

            <div class="test-details">
                <h2>📊 Test Execution Summary</h2>
                <p><strong>Framework:</strong> Playwright + Cucumber</p>
                <p><strong>Environment:</strong> Test</p>
                <p><strong>Browser:</strong> Chrome (Headless)</p>
                <p><strong>Report Style:</strong> Spark Theme</p>
                <p><strong>Total Execution Time:</strong> <span id="execution-time">N/A</span></p>
            </div>

            <div class="test-details" id="feature-details">
                <h2>📝 Feature Details</h2>
                <p>Detailed test results will be populated here...</p>
            </div>

            <div class="footer">
                <p>Generated by Parabank Automation Framework</p>
                <p>Powered by Playwright + Cucumber + Spark Reports</p>
            </div>
        </body>
        </html>
        `;
    }
}

module.exports = { PDFGenerator };