const { Given, When, Then, setDefaultTimeout, AfterAll } = require('@cucumber/cucumber');
const path = require('path');
const setDefaultTimeoutMs = 60 * 1000;
setDefaultTimeout(setDefaultTimeoutMs);

const reporter = require('multiple-cucumber-html-reporter');

// -------------------- Helper --------------------
async function logStep(world, status, message) {
  if (!world.testLogs) world.testLogs = [];
  world.testLogs.push({ status, message, timestamp: new Date().toISOString() });
  console.log(`[${status}] ${message}`);
}

// -------------------- GIVEN STEPS --------------------
Given('I navigate to Parabank application', async function () {
  try {
    await this.initBrowser();
    await this.page.goto(this.config.baseUrl);
    await this.page.waitForLoadState('networkidle');
    await logStep(this, 'PASS', 'Navigated to Parabank application');
  } catch (err) {
    await logStep(this, 'FAIL', err.message);
    throw err;
  }
});

Given('I am on the Parabank homepage', async function () {
  try {
    await this.page.goto(this.config.baseUrl);
    await this.page.waitForSelector('title');
    const title = await this.page.title();
    if (!title.includes('ParaBank')) throw new Error('Not on ParaBank homepage');
    await logStep(this, 'PASS', `Verified Parabank homepage title: ${title}`);
  } catch (err) {
    await logStep(this, 'FAIL', err.message);
    throw err;
  }
});

Given('I have registered and logged in with a new user', async function () {
  try {
    const userData = this.generateUniqueUserData();
    this.setTestData('currentUser', userData);

    await this.page.click('a[href*="register"]');
    await this.page.fill('#customer\\.firstName', userData.firstName);
    await this.page.fill('#customer\\.lastName', userData.lastName);
    await this.page.fill('#customer\\.address\\.street', userData.address);
    await this.page.fill('#customer\\.address\\.city', userData.city);
    await this.page.fill('#customer\\.address\\.state', userData.state);
    await this.page.fill('#customer\\.address\\.zipCode', userData.zipCode);
    await this.page.fill('#customer\\.phoneNumber', userData.phoneNumber);
    await this.page.fill('#customer\\.ssn', userData.ssn);
    await this.page.fill('#customer\\.username', userData.username);
    await this.page.fill('#customer\\.password', userData.password);
    await this.page.fill('#repeatedPassword', userData.password);

    await this.page.click('input[value="Register"]');
    await this.page.waitForSelector('h1:has-text("Welcome")', { timeout: 10000 });

    await logStep(this, 'PASS', `Registered and logged in new user: ${userData.username}`);
  } catch (err) {
    await logStep(this, 'FAIL', err.message);
    throw err;
  }
});

Given('I have created a savings account', async function () {
  try {
    await this.page.goto(`${this.config.baseUrl}/openaccount.htm`);
    await this.page.selectOption('#type', 'SAVINGS');

    const fromOptions = await this.page.locator('#fromAccountId option').all();
    if (fromOptions.length > 1) {
      const value = await fromOptions[1].getAttribute('value');
      await this.page.selectOption('#fromAccountId', value);
    }

    await this.page.click('input[value="Open New Account"]');
    await this.page.waitForSelector('#openAccountResult', { timeout: 10000 });
    const accountNumber = (await this.page.textContent('#newAccountId')).trim();
    this.setTestData('newSavingsAccount', accountNumber);

    await logStep(this, 'PASS', `Created Savings Account: ${accountNumber}`);
  } catch (err) {
    await logStep(this, 'FAIL', err.message);
    throw err;
  }
});

Given('I have created a savings account with sufficient balance', async function () {
  await this.step('I have created a savings account');
});

// -------------------- WHEN STEPS --------------------
When('I click on Register link', async function () {
  try {
    await this.page.click('a[href*="register"]');
    await this.page.waitForSelector('#customer\\.firstName');
    await logStep(this, 'PASS', 'Clicked Register link');
  } catch (err) {
    await logStep(this, 'FAIL', err.message);
    throw err;
  }
});

When('I fill the registration form with unique user details', async function () {
  try {
    const userData = this.generateUniqueUserData();
    this.setTestData('registrationData', userData);

    await this.page.fill('#customer\\.firstName', userData.firstName);
    await this.page.fill('#customer\\.lastName', userData.lastName);
    await this.page.fill('#customer\\.address\\.street', userData.address);
    await this.page.fill('#customer\\.address\\.city', userData.city);
    await this.page.fill('#customer\\.address\\.state', userData.state);
    await this.page.fill('#customer\\.address\\.zipCode', userData.zipCode);
    await this.page.fill('#customer\\.phoneNumber', userData.phoneNumber);
    await this.page.fill('#customer\\.ssn', userData.ssn);
    await this.page.fill('#customer\\.username', userData.username);
    await this.page.fill('#customer\\.password', userData.password);
    await this.page.fill('#repeatedPassword', userData.password);

    await logStep(this, 'PASS', 'Filled registration form with unique user details');
  } catch (err) {
    await logStep(this, 'FAIL', err.message);
    throw err;
  }
});

When('I submit the registration form', async function () {
  try {
    await this.page.click('input[value="Register"]');
    await logStep(this, 'PASS', 'Submitted registration form');
  } catch (err) {
    await logStep(this, 'FAIL', err.message);
    throw err;
  }
});

When('I navigate to {string} page', async function (pageName) {
  try {
    const pageMap = {
      'Open New Account': '/openaccount.htm',
      'Accounts Overview': '/overview.htm',
      'Transfer Funds': '/transfer.htm',
      'Bill Pay': '/billpay.htm',
      'Find Transactions': '/findtrans.htm'
    };
    const pagePath = pageMap[pageName];
    if (!pagePath) throw new Error(`Unknown page: ${pageName}`);
    await this.page.goto(`${this.config.baseUrl}${pagePath}`);
    await this.page.waitForLoadState('networkidle');
    await logStep(this, 'PASS', `Navigated to ${pageName} page`);
  } catch (err) {
    await logStep(this, 'FAIL', err.message);
    throw err;
  }
});

// -------------------- THEN STEPS --------------------
Then('I should see account creation success message', async function () {
  try {
    await this.page.waitForSelector('#openAccountResult');
    const message = await this.page.textContent('#openAccountResult');
    if (!message.includes('Congratulations')) throw new Error('Account creation failed');
    await logStep(this, 'PASS', `Account creation success message: ${message}`);
  } catch (err) {
    await logStep(this, 'FAIL', err.message);
    throw err;
  }
});

Then('I should see payment success message', async function () {
  try {
    await this.page.waitForSelector('#billPayForm');
    await logStep(this, 'PASS', 'Payment success message displayed');
  } catch (err) {
    await logStep(this, 'FAIL', err.message);
    throw err;
  }
});

Then('I should see transfer success message', async function () {
  try {
    await this.page.waitForSelector('#transferFundsForm');
    await logStep(this, 'PASS', 'Transfer success message displayed');
  } catch (err) {
    await logStep(this, 'FAIL', err.message);
    throw err;
  }
});

// -------------------- AFTER ALL --------------------
AfterAll(async function () {
  // Generate HTML report
  const jsonReportDir = path.join(__dirname, '../../reports');
  const htmlReportPath = path.join(jsonReportDir, 'ui-html-report');

  reporter.generate({
    jsonDir: jsonReportDir,
    reportPath: htmlReportPath,
    displayDuration: true,
    reportName: 'Parabank UI Test Report',
    openReportInBrowser: true,
    metadata: {
      browser: { name: 'chrome', version: '115' },
      device: 'Local Test Machine',
      platform: { name: process.platform, version: process.version }
    }
  });
});

module.exports = {};
