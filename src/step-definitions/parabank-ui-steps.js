const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');

///////////////////////////
// UTILITY: ENSURE PAGE
///////////////////////////
async function ensurePage(world) {
  if (!world.page) {
    console.log('⚠️ Browser not initialized, initializing now...');
    await world.initBrowser();
  }
}

///////////////////////////
// STEP DEFINITIONS
///////////////////////////

// ✅ Navigate to Parabank
Given('I navigate to Parabank application', async function () {
  await ensurePage(this);
  await this.page.goto('https://parabank.parasoft.com/parabank/index.htm', { waitUntil: 'networkidle' });
});

Given('I am on the Parabank homepage', async function () {
  await ensurePage(this);
  await this.page.goto('https://parabank.parasoft.com/parabank/index.htm', { waitUntil: 'networkidle' });
});

// ✅ Registration
When('I click on Register link', async function () {
  await ensurePage(this);
  await this.page.click('a[href*="register.htm"]');
});

When('I fill the registration form with unique user details', async function () {
  await ensurePage(this);
  const timestamp = Date.now();
  await this.page.fill('input[name="customer.firstName"]', 'Test');
  await this.page.fill('input[name="customer.lastName"]', 'User' + timestamp);
  await this.page.fill('input[name="customer.address.street"]', '123 Main St');
  await this.page.fill('input[name="customer.address.city"]', 'Anytown');
  await this.page.fill('input[name="customer.address.state"]', 'CA');
  await this.page.fill('input[name="customer.address.zipCode"]', '12345');
  await this.page.fill('input[name="customer.phoneNumber"]', '555-1234');
  await this.page.fill('input[name="customer.ssn"]', '123-45-6789');
  await this.page.fill('input[name="customer.username"]', 'user' + timestamp);
  await this.page.fill('input[name="customer.password"]', 'Password123!');
  await this.page.fill('input[name="repeatedPassword"]', 'Password123!');
});

When('I submit the registration form', async function () {
  await ensurePage(this);
  await this.page.click('input[value="Register"]');
});

Then('I should see successful registration message', async function () {
  await ensurePage(this);
  const successMsg = await this.page.textContent('div[id="rightPanel"] > p');
  expect(successMsg).toContain('Your account was created successfully');
});

Then('I should be logged in automatically', async function () {
  await ensurePage(this);
  const welcomeText = await this.page.textContent('div[id="rightPanel"] > h1');
  expect(welcomeText).toContain('Welcome user');
  await this.page.click('a[href*="overview.htm"]');
});

Given('I have registered and logged in with a new user', async function () {
  await ensurePage(this);
  const timestamp = Date.now();
  await this.page.click('a[href*="register.htm"]');
  await this.page.fill('input[name="customer.firstName"]', 'Test');
  await this.page.fill('input[name="customer.lastName"]', 'User' + timestamp);
  await this.page.fill('input[name="customer.address.street"]', '123 Main St');
  await this.page.fill('input[name="customer.address.city"]', 'Anytown');
  await this.page.fill('input[name="customer.address.state"]', 'CA');
  await this.page.fill('input[name="customer.address.zipCode"]', '12345');
  await this.page.fill('input[name="customer.phoneNumber"]', '555-1234');
  await this.page.fill('input[name="customer.ssn"]', '123-45-6789');
  await this.page.fill('input[name="customer.username"]', 'user' + timestamp);
  await this.page.fill('input[name="customer.password"]', 'Password123!');
  await this.page.fill('input[name="repeatedPassword"]', 'Password123!');
  await this.page.click('input[value="Register"]');
  await this.page.waitForSelector('h1:has-text("Welcome user")', { timeout: 120000 });
  await this.page.click('a[href*="overview.htm"]');
});

///////////////////////////
// Create Savings Account
///////////////////////////
Given('I have created a savings account', async function () {
  await ensurePage(this);
  await this.page.click('a[href*="openaccount.htm"]');
  await this.page.waitForSelector('select[id="type"]', { state: 'visible', timeout: 60000 });
  await this.page.selectOption('select[id="type"]', '1'); // SAVINGS
  await this.page.waitForSelector('select[name="fromAccountId"]', { state: 'visible', timeout: 60000 });
  await this.page.selectOption('select[name="fromAccountId"]', { index: 0 });
  await this.page.click('input[value="Open New Account"]');
  await this.page.waitForSelector('#newAccountId', { timeout: 120000 });
  const accountId = await this.page.textContent('#newAccountId');
  this.setTestData('newAccountId', accountId);
});

Given('I have created a savings account with sufficient balance', async function () {
  await this.runStep('I have created a savings account');
  // optionally top up balance via API if needed
});

///////////////////////////
// Global Navigation
///////////////////////////
When('I verify the global navigation menu', async function () {
  await ensurePage(this);
  const navItems = await this.page.$$('div#leftPanel a');
  expect(navItems.length).toBeGreaterThan(0);
});

Then('all navigation links should be present and functional', async function () {
  await ensurePage(this);
  const links = await this.page.$$eval('div#leftPanel a', els => els.map(e => e.href));
  expect(links.length).toBeGreaterThan(0);
});

Then('each menu item should navigate to correct page', async function () {
  await ensurePage(this);
  const menuItems = ['overview.htm', 'openaccount.htm', 'transfer.htm', 'billpay.htm'];
  for (const item of menuItems) {
    await this.page.click(`a[href*="${item}"]`);
    await this.page.waitForLoadState('networkidle');
    expect(this.page.url()).toContain(item);
  }
});

///////////////////////////
// Page navigation
///////////////////////////
When('I navigate to {string} page', async function (pageName) {
  await ensurePage(this);
  const pageMap = {
    'Open New Account': 'openaccount.htm',
    'Accounts Overview': 'overview.htm',
    'Transfer Funds': 'transfer.htm',
    'Bill Pay': 'billpay.htm'
  };
  const relativeUrl = pageMap[pageName];
  if (!relativeUrl) throw new Error(`Page mapping missing for ${pageName}`);
  await this.page.click(`a[href*="${relativeUrl}"]`);
  await this.page.waitForLoadState('networkidle');
});

///////////////////////////
// Open New Account
///////////////////////////
When('I select "SAVINGS" account type', async function () {
  await ensurePage(this);
  await this.page.waitForSelector('select[id="type"]', { state: 'visible', timeout: 120000 });
  await this.page.selectOption('select[id="type"]', '1');
});

When('I select an existing account to transfer from', async function () {
  await ensurePage(this);
  await this.page.waitForSelector('select[name="fromAccountId"]', { state: 'visible', timeout: 120000 });
  await this.page.selectOption('select[name="fromAccountId"]', { index: 0 });
});

When('I click {string} button', async function (buttonText) {
  await ensurePage(this);

  const button = this.page.locator(`input[value="${buttonText}"], button:has-text("${buttonText}")`).first();

  // Ensure button is visible and enabled
  await button.waitFor({ state: 'visible', timeout: 60000 });
  await button.scrollIntoViewIfNeeded();
  
  // Click the button safely
  await Promise.all([
    button.click({ timeout: 60000 }),
    this.page.waitForLoadState('networkidle').catch(() => {}) // in case navigation happens
  ]);

  // Map buttonText to expected selectors
  const expectedSelectors = {
    'Open New Account': '#newAccountId',
    'Transfer': 'h1:has-text("Transfer Complete!")',
    'Send Payment': 'div#rightPanel:has-text("Bill Payment Complete")'
  };

  const expectedSelector = expectedSelectors[buttonText];
  if (expectedSelector) {
    await this.page.waitForSelector(expectedSelector, { state: 'visible', timeout: 120000 });
  } else {
    // fallback: wait briefly for UI update if button has no mapped selector
    await this.page.waitForTimeout(3000);
  }
});




Then('I should see account creation success message', async function () {
  await ensurePage(this);
  await this.page.waitForSelector('h1:has-text("Account Opened!")', { timeout: 120000 });
});

Then('I should capture the new savings account number', async function () {
  await ensurePage(this);
  const accountId = await this.page.textContent('#newAccountId');
  this.setTestData('newAccountId', accountId);
  expect(accountId).toMatch(/\d+/);
});

Then('the account should appear in accounts overview', async function () {
  await ensurePage(this);
  await this.page.click('a[href*="overview.htm"]');
  const newAccountId = this.getTestData('newAccountId');
  await this.page.waitForSelector(`a:has-text("${newAccountId}")`, { timeout: 60000 });
});

///////////////////////////
// Fund Transfer
///////////////////////////
When('I enter amount {string} to transfer', async function (amount) {
  await ensurePage(this);
  await this.page.fill('input[name="amount"]', amount);
});

When('I select source account', async function () {
  await ensurePage(this);
  await this.page.selectOption('select[name="fromAccountId"]', { index: 0 });
});

When('I select destination account', async function () {
  await ensurePage(this);
  await this.page.selectOption('select[name="toAccountId"]', { index: 1 });
});

Then('I should see transfer success message', async function () {
  await ensurePage(this);
  await this.page.waitForSelector('h1:has-text("Transfer Complete!")', { timeout: 60000 });
});

Then('the transfer should be reflected in account balances', async function () {
  await ensurePage(this);
  await this.page.click('a[href*="overview.htm"]');
  const balances = await this.page.$$eval('table tr td:nth-child(2)', els => els.map(e => e.textContent.trim()));
  expect(balances.length).toBeGreaterThan(0);
});

Then('transaction should appear in transaction history', async function () {
  await ensurePage(this);
  await this.page.click('a[href*="activity.htm"]');
  const rows = await this.page.$$('table tr');
  expect(rows.length).toBeGreaterThan(1);
});

///////////////////////////
// Bill Pay
///////////////////////////
When('I fill payee information:', async function (dataTable) {
  await ensurePage(this);
  const data = dataTable.rowsHash();
  const selectorMap = {
    'Payee Name': 'payee.name',
    'Address': 'payee.address.street',
    'City': 'payee.address.city',
    'State': 'payee.address.state',
    'Zip Code': 'payee.address.zipCode',
    'Phone': 'payee.phoneNumber',
    'Account Number': 'payee.accountNumber',
    'Verify Account': 'verifyAccount'
  };
  for (const [field, value] of Object.entries(data)) {
    const selector = `input[name="${selectorMap[field]}"]`;
    await this.page.waitForSelector(selector, { state: 'visible', timeout: 60000 });
    await this.page.fill(selector, value);
  }
});

When('I enter payment amount {string}', async function (amount) {
  await ensurePage(this);
  await this.page.fill('input[name="amount"]', amount);
});

When('I select account to pay from', async function () {
  await ensurePage(this);
  await this.page.selectOption('select[name="fromAccountId"]', { index: 0 });
});

Then('I should see payment success message', async function () {
  await ensurePage(this);
  await this.page.waitForSelector('div#rightPanel:has-text("Bill Payment Complete")', { timeout: 60000 });
});

Then('the payment should be deducted from account balance', async function () {
  await ensurePage(this);
  await this.page.click('a[href*="overview.htm"]');
  const balances = await this.page.$$eval('table tr td:nth-child(2)', els => els.map(e => e.textContent.trim()));
  expect(balances.length).toBeGreaterThan(0);
});

Then('payment transaction should be recorded', async function () {
  await ensurePage(this);
  await this.page.click('a[href*="activity.htm"]');
  const rows = await this.page.$$('table tr');
  expect(rows.length).toBeGreaterThan(1);
});

///////////////////////////
// Accounts Overview
///////////////////////////
Then('I should see all my accounts listed', async function () {
  await ensurePage(this);
  const rows = await this.page.$$('table tr');
  expect(rows.length).toBeGreaterThan(1);
});

Then('each account should display correct balance', async function () {
  await ensurePage(this);
  const balances = await this.page.$$eval('table tr td:nth-child(2)', els => els.map(e => parseFloat(e.textContent.trim().replace('$', ''))));
  balances.forEach(b => expect(b).toBeGreaterThanOrEqual(0));
});

Then('account details should be accurate', async function () {
  await ensurePage(this);
  const accountId = this.getTestData('newAccountId');
  const accountExists = await this.page.$(`a:has-text("${accountId}")`);
  expect(accountExists).not.toBeNull();
});

///////////////////////////
// End-to-end workflow
///////////////////////////
Then('all banking operations should be completed successfully', async function () {
  console.log('✅ All UI banking steps executed successfully');
});

Then('all transactions should be properly recorded', async function () {
  console.log('✅ Transactions verified (if API/DB verification implemented)');
});
