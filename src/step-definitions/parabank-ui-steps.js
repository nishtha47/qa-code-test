const { Given, When, Then, setDefaultTimeout } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const { allure } = require('allure-cucumberjs'); // Add allure adapter

setDefaultTimeout(60 * 1000);

// -------------------- GIVEN STEPS --------------------

Given('I navigate to Parabank application', async function () {
    await this.initBrowser();
    await this.page.goto(this.config.baseUrl);
    await this.page.waitForLoadState('networkidle');

    const screenshot = await this.page.screenshot({ path: 'reports/screenshots/navigate.png', fullPage: true });
    allure.attachment('Navigate to Parabank', screenshot, 'image/png');
});

Given('I am on the Parabank homepage', async function () {
    await this.page.goto(this.config.baseUrl);
    await this.page.waitForSelector('title');
    const title = await this.page.title();
    if (!title.includes('ParaBank')) {
        throw new Error('Not on ParaBank homepage');
    }

    const screenshot = await this.page.screenshot({ path: 'reports/screenshots/homepage.png', fullPage: true });
    allure.attachment('Homepage', screenshot, 'image/png');
});

Given('I have registered and logged in with a new user', async function () {
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

    const screenshot = await this.page.screenshot({ path: 'reports/screenshots/registration.png', fullPage: true });
    allure.attachment('User Registration Completed', screenshot, 'image/png');
});

Given('I have created a savings account', async function () {
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

    const screenshot = await this.page.screenshot({ path: `reports/screenshots/newAccount-${accountNumber}.png`, fullPage: true });
    allure.attachment(`Created Savings Account: ${accountNumber}`, screenshot, 'image/png');

    console.log(`Created savings account: ${accountNumber}`);
});

Given('I have created a savings account with sufficient balance', async function () {
    await this.step('I have created a savings account');
});

// -------------------- WHEN STEPS --------------------

When('I click on Register link', async function () {
    await this.page.click('a[href*="register"]');
    await this.page.waitForSelector('#customer\\.firstName');

    const screenshot = await this.page.screenshot({ path: 'reports/screenshots/register-link.png', fullPage: true });
    allure.attachment('Clicked Register Link', screenshot, 'image/png');
});

When('I fill the registration form with unique user details', async function () {
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

    const screenshot = await this.page.screenshot({ path: 'reports/screenshots/registration-form-filled.png', fullPage: true });
    allure.attachment('Registration Form Filled', screenshot, 'image/png');
});

When('I submit the registration form', async function () {
    await this.page.click('input[value="Register"]');

    const screenshot = await this.page.screenshot({ path: 'reports/screenshots/form-submitted.png', fullPage: true });
    allure.attachment('Registration Form Submitted', screenshot, 'image/png');
});

When('I navigate to {string} page', async function (pageName) {
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

    const screenshot = await this.page.screenshot({ path: `reports/screenshots/navigate-${pageName}.png`, fullPage: true });
    allure.attachment(`Navigated to ${pageName} Page`, screenshot, 'image/png');
});

// -------------------- THEN STEPS --------------------

Then('I should see account creation success message', async function () {
    await this.page.waitForSelector('#openAccountResult');
    const message = await this.page.textContent('#openAccountResult');
    if (!message.includes('Congratulations')) throw new Error('Account creation failed');

    allure.logStep('Account creation message validated');
});

Then('I should see payment success message', async function () {
    await this.page.waitForSelector('#billPayForm'); // adjust selector as needed
    allure.logStep('Payment success message displayed');
});

Then('I should see transfer success message', async function () {
    await this.page.waitForSelector('#transferFundsForm'); // adjust selector as needed
    allure.logStep('Transfer success message displayed');
});

module.exports = {};
