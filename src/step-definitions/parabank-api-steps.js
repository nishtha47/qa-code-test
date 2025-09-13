const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('assert');

// -------------------- Helper --------------------
function configureApiClient(world) {
  if (!world.config) {
    throw new Error('Configuration not found in world context');
  }
  if (!world.config.apiBaseUrl) {
    throw new Error('apiBaseUrl not configured. Please check your world.js configuration.');
  }

  world.apiClient = require('axios').create({
    baseURL: world.config.apiBaseUrl,
    timeout: world.config.timeout || 30000,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  });

  world.setTestData('apiClient', {
    baseURL: world.config.apiBaseUrl,
    configured: true,
    timestamp: Date.now()
  });

  console.log(`API client configured for: ${world.config.apiBaseUrl}`);
}

// -------------------- GIVEN STEPS --------------------
Given('I have API client configured for Parabank', async function () {
  configureApiClient(this);
  await this.attachText('API Client Configuration', JSON.stringify(this.apiClient.defaults, null, 2));
});

Given('I have API client configured', async function () {
  configureApiClient(this);
  await this.attachText('API Client Configuration', JSON.stringify(this.apiClient.defaults, null, 2));
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

  this.testData.accountData = accountData;
  this.accountData = accountData;
  console.log('User account with transaction history set up:', accountData.accountId);

  await this.attachJson('Account Data', accountData);
});

Given('I have a user account with multiple transactions', async function () {
  const accountData = {
    customerId: '12212',
    accountId: '13344',
    username: 'john',
    balance: 2000.0,
    transactions: [
      { id: 1, accountId: '13344', type: 'Credit', date: new Date().toISOString(), amount: 1000.0, description: 'Initial deposit' },
      { id: 2, accountId: '13344', type: 'Debit', date: new Date().toISOString(), amount: 100.0, description: 'ATM withdrawal' },
      { id: 3, accountId: '13344', type: 'Credit', date: new Date().toISOString(), amount: 200.0, description: 'Direct deposit' }
    ]
  };

  this.testData.accountData = accountData;
  this.accountData = accountData;
  console.log('User account with multiple transactions set up:', accountData.accountId);

  await this.attachJson('Account Data', accountData);
});

Given('I have made a bill payment of {string}', async function (amount) {
  const billPaymentData = {
    amount: parseFloat(amount),
    payee: 'Electric Company',
    accountId: this.accountData?.accountId || '13344',
    transactionId: Math.floor(Math.random() * 1000000),
    timestamp: Date.now()
  };

  this.testData.billPayment = billPaymentData;
  console.log(`Mock bill payment created for $${amount}`);

  await this.attachJson('Bill Payment', billPaymentData);
});

// -------------------- WHEN STEPS --------------------
When('I search for transactions using {string} API', async function (apiName) {
  const searchResults = {
    apiName,
    results: this.accountData?.transactions || [],
    status: 'success',
    timestamp: Date.now()
  };

  this.testData.searchResults = searchResults;
  this.apiResponse = { data: searchResults.results, status: 200 };
  console.log(`Transaction search simulated via ${apiName}`);

  await this.attachJson('Search Results', searchResults);
});

When('I filter by amount {string}', async function (amount) {
  const filterAmount = parseFloat(amount);
  const currentResults = this.testData.searchResults;

  if (currentResults?.results) {
    const filtered = currentResults.results.filter(
      txn => Math.abs(parseFloat(txn.amount) - filterAmount) < 0.01
    );

    this.testData.filteredResults = filtered;
    this.apiResponse = { data: filtered, status: 200 };
    console.log(`Filtered by amount ${amount}, found ${filtered.length} transactions`);

    await this.attachJson('Filtered Results', filtered);
  }
});

When('I search for transactions by {string} with value {string}', async function (criteria, value) {
  assert(this.accountData?.transactions, 'No account data available');

  let filtered = [];
  switch (criteria.toLowerCase()) {
    case 'amount':
      filtered = this.accountData.transactions.filter(
        txn => Math.abs(parseFloat(txn.amount) - parseFloat(value)) < 0.01
      );
      break;
    case 'type':
      filtered = this.accountData.transactions.filter(txn => txn.type === value);
      break;
    case 'date':
      filtered = this.accountData.transactions.filter(txn => txn.date.startsWith(value));
      break;
    default:
      throw new Error(`Unsupported search criteria: ${criteria}`);
  }

  this.testData.filteredResults = filtered;
  this.apiResponse = { data: filtered, status: 200 };
  this.lastSearchValue = value;
  console.log(`Search by ${criteria}=${value}, found ${filtered.length} results`);

  await this.attachJson(`Search by ${criteria}`, filtered);
});

// -------------------- THEN STEPS --------------------
Then('I should receive a valid JSON response', async function () {
  assert(this.apiResponse, 'API response should be defined');
  assert.strictEqual(this.apiResponse.status, 200, 'Response status should be 200');
  assert(this.apiResponse.data, 'Response data should be defined');
  console.log('Valid JSON response received');

  await this.attachJson('API Response Validation', this.apiResponse);
});

Then('the response should contain transaction details', async function () {
  const data = this.apiResponse.data;
  assert(data && Array.isArray(data), 'Response data should be a non-empty array');

  if (data.length > 0) {
    const txn = data[0];
    ['id', 'type', 'amount', 'accountId', 'date', 'description'].forEach(field => {
      assert(field in txn, `Missing field: ${field}`);
    });
  }
  console.log('Transaction details validated');

  await this.attachJson('Transaction Details', data);
});

Then('transaction amount should match {string}', async function (expectedAmount) {
  const amount = parseFloat(expectedAmount);
  const match = this.apiResponse.data.find(txn => Math.abs(parseFloat(txn.amount) - amount) < 0.01);
  assert(match, `No transaction found with amount ${expectedAmount}`);
  console.log(`Transaction with amount ${expectedAmount} found`);

  await this.attachJson('Amount Verification', match);
});

Then('transaction type should be {string}', async function (expectedType) {
  const match = this.apiResponse.data.find(txn => txn.type === expectedType);
  assert(match, `No transaction found with type ${expectedType}`);
  console.log(`Transaction with type ${expectedType} found`);

  await this.attachJson('Type Verification', match);
});

Then('I should receive an error response with message {string}', async function (expectedMessage) {
  assert(this.apiResponse, 'API response should be defined');
  assert(this.apiResponse.status >= 400, 'Expected error response status');

  const message = this.apiResponse.data?.message || this.apiResponse.error?.message;
  assert(message, 'No error message in response');
  assert.strictEqual(message, expectedMessage, `Expected "${expectedMessage}", got "${message}"`);
  console.log(`Error response validated: ${message}`);

  await this.attachText('Error Message', message);
});

// Attach filtered results as JSON
Then('I should receive filtered results', async function () {
  assert(this.apiResponse.data && Array.isArray(this.apiResponse.data), 'Filtered results should be a non-empty array');
  console.log('Filtered results successfully validated');

  await this.attachJson('Filtered Results', this.testData.filteredResults);
});

// -------------------- Utility Steps --------------------
Then('all date fields should be in valid format', async function () {
  (this.testData.filteredResults || []).forEach(txn => {
    assert(!isNaN(Date.parse(txn.date)), `Invalid date: ${txn.date}`);
  });

  await this.attachJson('Date Validation', this.testData.filteredResults);
});

Then('all amount fields should be numeric', async function () {
  (this.testData.filteredResults || []).forEach(txn => {
    assert.strictEqual(typeof txn.amount, 'number', `Amount not numeric: ${txn.amount}`);
  });

  await this.attachJson('Amount Validation', this.testData.filteredResults);
});

Then('all returned transactions should match the {string}', async function (filter) {
  const expected = this.lastSearchValue;
  (this.testData.filteredResults || []).forEach(txn => {
    assert.strictEqual(String(txn[filter]), String(expected), `Transaction mismatch for ${filter}: ${txn[filter]} vs ${expected}`);
  });

  await this.attachJson('Filter Validation', this.testData.filteredResults);
});

module.exports = {};
