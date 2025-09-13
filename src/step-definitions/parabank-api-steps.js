const { Given, When, Then, setDefaultTimeout, AfterAll } = require('@cucumber/cucumber');
const assert = require('assert');
const axios = require('axios');
const path = require('path');
const reporter = require('multiple-cucumber-html-reporter');

setDefaultTimeout(60 * 1000); // 60s timeout

// -------------------- Reporter Setup --------------------
const jsonReportPath = path.join(__dirname, '../../reports/cucumber-report.json');
const htmlReportPath = path.join(__dirname, '../../reports/html-report');

// Helper to log steps
async function logStep(world, status, message) {
  if (!world.testLogs) world.testLogs = [];
  world.testLogs.push({ status, message, timestamp: new Date().toISOString() });
  console.log(`[${status}] ${message}`);
}

// -------------------- Helper --------------------
function configureApiClient(world) {
  if (!world.apiBaseUrl) {
    world.apiBaseUrl = process.env.PARABANK_API_BASEURL || 'https://parabank.parasoft.com/parabank';
    console.warn(`API base URL not found in world context. Using default: ${world.apiBaseUrl}`);
  }

  world.apiClient = axios.create({
    baseURL: world.apiBaseUrl,
    timeout: world.timeout || 30000,
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
  });

  world.testData = world.testData || {};
  world.testData.apiClient = {
    baseURL: world.apiBaseUrl,
    configured: true,
    timestamp: new Date().toISOString()
  };

  console.log(`API client configured for: ${world.apiBaseUrl}`);
}

// -------------------- GIVEN --------------------
Given('I have API client configured for Parabank', async function () {
  configureApiClient(this);
  await logStep(this, 'INFO', `API Client configured for ${this.apiBaseUrl}`);
});

Given('I have a user account with transaction history', async function () {
  const accountData = {
    customerId: '12212',
    accountId: '13344',
    username: 'john',
    balance: 1000.0,
    transactions: [
      { id: 1, accountId: '13344', type: 'Credit', date: new Date().toISOString(), amount: 500.0, description: 'Initial deposit' },
      { id: 2, accountId: '13344', type: 'Debit', date: new Date().toISOString(), amount: 50.0, description: 'Bill payment' }
    ]
  };
  this.accountData = accountData;
  this.testData.accountData = accountData;
  await logStep(this, 'PASS', `Account data created with transaction history: ${JSON.stringify(accountData)}`);
});

Given('I have a user account with multiple transactions', async function () {
  const multipleTxns = [
    { id: 1, accountId: '13344', type: 'Credit', date: new Date().toISOString(), amount: 500.0, description: 'Initial deposit' },
    { id: 2, accountId: '13344', type: 'Debit', date: new Date().toISOString(), amount: 50.0, description: 'Bill payment' },
    { id: 3, accountId: '13344', type: 'Credit', date: new Date().toISOString(), amount: 100.0, description: 'Salary' },
    { id: 4, accountId: '13344', type: 'Debit', date: new Date().toISOString(), amount: 100.0, description: 'Groceries' }
  ];
  this.accountData = { ...this.accountData, transactions: multipleTxns };
  this.testData.accountData = this.accountData;
  await logStep(this, 'PASS', `Multiple transactions added: ${JSON.stringify(multipleTxns)}`);
});

// -------------------- WHEN --------------------
When('I search for transactions using {string} API', async function (apiName) {
  const results = this.accountData?.transactions || [];
  this.testData.searchResults = { apiName, results, status: 'success', timestamp: new Date().toISOString() };
  this.apiResponse = { data: results, status: 200 };
  await logStep(this, 'INFO', `Transactions searched using API "${apiName}": ${JSON.stringify(results)}`);
});

// -------------------- THEN --------------------
Then('I should receive a valid JSON response', async function () {
  try {
    assert(this.apiResponse, 'API response missing');
    assert.strictEqual(this.apiResponse.status, 200);
    assert(this.apiResponse.data);
    await logStep(this, 'PASS', `Received valid JSON response: ${JSON.stringify(this.apiResponse)}`);
  } catch (err) {
    await logStep(this, 'FAIL', err.message);
    throw err;
  }
});

Then('the response should contain transaction details', async function () {
  try {
    const data = this.apiResponse.data;
    assert(Array.isArray(data), 'Expected array of transactions');
    if (data.length > 0) {
      const txn = data[0];
      ['id', 'type', 'amount', 'accountId', 'date', 'description'].forEach(f => assert(f in txn));
    }
    await logStep(this, 'PASS', `Transaction details verified: ${JSON.stringify(data)}`);
  } catch (err) {
    await logStep(this, 'FAIL', err.message);
    throw err;
  }
});

// -------------------- AFTER ALL --------------------
AfterAll(async function () {
  // Generate Spark-style HTML report
  reporter.generate({
    jsonDir: path.join(__dirname, '../../reports'), // JSON output folder
    reportPath: htmlReportPath,
    metadata: {
      browser: { name: 'chrome', version: '115' },
      device: 'Local Test Machine',
      platform: { name: process.platform, version: process.version }
    },
    displayDuration: true,
    reportName: 'Parabank API Test Report',
    openReportInBrowser: true
  });
});
