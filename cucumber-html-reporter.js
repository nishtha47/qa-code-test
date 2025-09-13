const reporter = require('cucumber-html-reporter');

const options = {
  theme: 'bootstrap',
  jsonFile: 'reports/cucumber-report.json', // Path to your Cucumber JSON report file
  output: 'reports/cucumber-html-report.html', // Output path for the HTML report
  reportSuiteAsScenarios: true,
  launchReport: true,
  metadata: {
    'App Version': '1.0.0',
    'Test Environment': 'Local',
    'Browser': 'Chrome 88',
    'Platform': 'Windows 10',
  },
};
reporter.generate(options);