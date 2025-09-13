const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  const htmlPath = 'file://' + path.join(__dirname, 'reports/extent/index.html');

  await page.goto(htmlPath, {waitUntil: 'networkidle0'});
  await page.pdf({
    path: path.join(__dirname, 'reports/extent/report.pdf'),
    format: 'A4',
    printBackground: true
  });

  await browser.close();
  console.log('PDF report generated at reports/extent/report.pdf');
})();
