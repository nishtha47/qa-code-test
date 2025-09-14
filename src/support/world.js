// src/support/world.js
const { setWorldConstructor, World, setDefaultTimeout } = require('@cucumber/cucumber');
const { chromium } = require('playwright');
const fs = require('fs');

// Default step timeout (60s)
setDefaultTimeout(60000);

class CustomWorld extends World {
    constructor(options) {
        super(options);
        this.browser = null;
        this.context = null;
        this.page = null;
        this.config = { baseUrl: 'https://parabank.parasoft.com/parabank/' };
        this.testData = {};
        this.apiResponse = { transactions: [] };
    }

    // -------------------- Browser Helpers --------------------
    async initBrowser() {
        if (!this.browser) {
            this.browser = await chromium.launch({ 
                headless: false,
                slowMo: 100,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
        }
        if (!this.context) {
            this.context = await this.browser.newContext({
                viewport: { width: 1280, height: 720 },
                ignoreHTTPSErrors: true
            });
        }
        if (!this.page) {
            this.page = await this.context.newPage();
            this.page.setDefaultTimeout(30000);
            this.page.setDefaultNavigationTimeout(30000);

            // Log browser console errors
            this.page.on('console', msg => {
                if (msg.type() === 'error') console.log(`🔴 Console Error: ${msg.text()}`);
            });
            this.page.on('pageerror', err => console.log(`🔴 Page Error: ${err.message}`));
        }
        return this.page;
    }

    async closeBrowser() {
        if (this.page) { await this.page.close(); this.page = null; }
        if (this.context) { await this.context.close(); this.context = null; }
        if (this.browser) { await this.browser.close(); this.browser = null; }
    }

    async navigateTo(path = '/') {
        if (!this.page) await this.initBrowser();
        const url = path.startsWith('http') ? path : `${this.config.baseUrl}${path}`;
        await this.page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    }

    // -------------------- Test Data Helpers --------------------
    setTestData(key, value) { this.testData[key] = value; }
    getTestData(key) { return this.testData[key]; }

    generateUniqueUserData() {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 100000);
        return {
            firstName: `TestFirst${timestamp}`,
            lastName: `TestLast${random}`,
            address: '123 Test St',
            city: 'TestCity',
            state: 'CA',
            zipCode: '12345',
            phoneNumber: '123-456-7890',
            ssn: `${Math.floor(100000000 + Math.random() * 900000000)}`,
            username: `user${timestamp}${random}`,
            password: 'Password123!'
        };
    }

    // -------------------- Registration Helper --------------------
    async registerAndLogin() {
        if (!this.page) await this.initBrowser();
        const user = this.generateUniqueUserData();
        this.setTestData('user', user);

        await this.navigateTo('register.htm');

        await this.page.fill('input[name="customer.firstName"]', user.firstName);
        await this.page.fill('input[name="customer.lastName"]', user.lastName);
        await this.page.fill('input[name="customer.address.street"]', user.address);
        await this.page.fill('input[name="customer.address.city"]', user.city);
        await this.page.fill('input[name="customer.address.state"]', user.state);
        await this.page.fill('input[name="customer.address.zipCode"]', user.zipCode);
        await this.page.fill('input[name="customer.phoneNumber"]', user.phoneNumber);
        await this.page.fill('input[name="customer.ssn"]', user.ssn);
        await this.page.fill('input[name="customer.username"]', user.username);
        await this.page.fill('input[name="customer.password"]', user.password);
        await this.page.fill('input[name="repeatedPassword"]', user.password);

        await this.page.click('input[value="Register"]');
        await this.page.waitForLoadState('networkidle');
        await this.page.waitForSelector('div[id="rightPanel"]', { timeout: 10000 });

        const message = await this.page.textContent('div[id="rightPanel"]');
        if (!message || !message.includes('Your account was created successfully')) {
            throw new Error('Registration failed');
        }

        return user;
    }

    // -------------------- Enhanced Navigation Helper --------------------
    async navigateToPage(pageName) {
        if (!this.page) await this.initBrowser();

        const pageMap = {
            'Open New Account': 'openaccount.htm',
            'Accounts Overview': 'overview.htm',
            'Transfer Funds': 'transfer.htm',
            'Bill Pay': 'billpay.htm',
            'Find Transactions': 'findtrans.htm',
            'Update Contact Info': 'updateprofile.htm'
        };

        const pagePath = pageMap[pageName];
        if (!pagePath) throw new Error(`Unknown page: ${pageName}`);
        await this.navigateTo(pagePath);
    }

    // -------------------- Account Creation Helper --------------------
    async createSavingsAccount() {
        if (!this.page) await this.initBrowser();
        await this.navigateToPage('Open New Account');

        const typeDropdown = this.page.locator('select[name="type"], select#type');
        await typeDropdown.waitFor({ state: 'visible', timeout: 30000 });
        await typeDropdown.selectOption('1'); // SAVINGS

        const fromAccountDropdown = this.page.locator('select[name="fromAccountId"]');
        await fromAccountDropdown.waitFor({ state: 'visible', timeout: 30000 });
        const fromAccountOptions = await fromAccountDropdown.locator('option').all();
        if (fromAccountOptions.length > 0) {
            const firstOptionValue = await fromAccountOptions[0].getAttribute('value');
            await fromAccountDropdown.selectOption(firstOptionValue);
        }

        await this.page.click('input[value="Open New Account"], button:has-text("Open New Account")');
        await this.page.waitForLoadState('networkidle');
        await this.page.waitForSelector('text=Congratulations, your account is now open', { timeout: 30000 });

        try {
            const accountNumberElement = this.page.locator('#newAccountId');
            await accountNumberElement.waitFor({ state: 'visible', timeout: 10000 });
            const accountNumber = await accountNumberElement.textContent();
            this.setTestData('newAccountNumber', accountNumber);
        } catch (error) {
            console.log('Could not capture account number:', error.message);
        }
    }

    // -------------------- Attachments --------------------
    async attachScreenshot(name = 'screenshot') {
        if (this.page && this.attach) {
            const buffer = await this.page.screenshot({ fullPage: true });
            await this.attach(buffer, 'image/png');
        }
    }

    async attachJson(name = 'data', obj) {
        if (this.attach) await this.attach(JSON.stringify(obj, null, 2), 'application/json');
    }

    // -------------------- Error Handling --------------------
    async handleError(error, context = '') {
        console.error(`Error in ${context}:`, error);
        if (this.page) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            if (!fs.existsSync('screenshots')) fs.mkdirSync('screenshots', { recursive: true });
            const screenshotPath = `screenshots/error-${context}-${timestamp}.png`;
            await this.page.screenshot({ path: screenshotPath, fullPage: true });
            await this.attachScreenshot();
        }
        throw error;
    }

    // -------------------- Wait Helpers --------------------
    async waitForElement(selector, timeout = 30000) { return await this.page.waitForSelector(selector, { timeout }); }
    async waitForText(text, timeout = 30000) { return await this.page.waitForSelector(`text=${text}`, { timeout }); }

    // -------------------- API Helpers --------------------
    setApiResponse(response) { this.apiResponse = { ...response, transactions: response?.transactions || [] }; }
    getApiResponse() { return this.apiResponse; }
    normalizeTransactionFields(txns) { return (txns || []).map(txn => ({ ...txn, id: Number(txn.id), accountId: Number(txn.accountId) })); }

    // -------------------- Cleanup Helper --------------------
    async cleanup() { await this.closeBrowser(); }
}

setWorldConstructor(CustomWorld);
