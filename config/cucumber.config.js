const path = require('path');

const config = {
  default: {
    // Feature files location
    features: ['src/features/**/*.feature'],

    // Step definitions location
    glue: ['src/step-definitions/**/*.js'],

    // Support files (hooks, world, etc.)
    support: ['src/support/**/*.js'],

    // Formatters
    format: [
      'progress-bar',
      `json:${path.join('reports', 'cucumber-report.json')}` // JSON output for HTML report
    ],

    // Parallel execution
    parallel: 1,

    // Retry failed scenarios
    retry: 0,

    // Exit on first failure
    failFast: false,

    // Strict mode
    strict: true,

    // Dry run
    dryRun: false,

    // World parameters
    worldParameters: {
      baseUrl: process.env.PARABANK_URL || 'https://parabank.parasoft.com/parabank',
      apiBaseUrl: process.env.PARABANK_API_URL || 'https://parabank.parasoft.com/parabank/services/bank',
      headless: process.env.HEADLESS !== 'false',
      timeout: 30000
    },

    // Tags
    tags: process.env.TAGS || 'not @skip'
  },

  // Profile for API tests only
  api: {
    features: ['src/features/**/*.feature'],
    glue: ['src/step-definitions/**/*.js'],
    support: ['src/support/**/*.js'],
    format: ['progress-bar', `json:${path.join('reports', 'cucumber-api-report.json')}`],
    tags: '@api',
    parallel: 2
  },

  // Profile for UI tests only
  ui: {
    features: ['src/features/**/*.feature'],
    glue: ['src/step-definitions/**/*.js'],
    support: ['src/support/**/*.js'],
    format: ['progress-bar', `json:${path.join('reports', 'cucumber-ui-report.json')}`],
    tags: '@ui',
    parallel: 1
  },

  // Profile for smoke tests
  smoke: {
    features: ['src/features/**/*.feature'],
    glue: ['src/step-definitions/**/*.js'],
    support: ['src/support/**/*.js'],
    format: ['progress-bar', `json:${path.join('reports', 'cucumber-smoke-report.json')}`],
    tags: '@smoke',
    parallel: 1
  }
};

module.exports = config;
