const { setWorldConstructor } = require('@cucumber/cucumber');
const { chromium } = require('playwright');
const { addAttachment } = require('@shelex/allure-commandline'); // Allure helper
const { allure } = require('@shelex/allure-commandline'); // ✅ Add this


class CustomWorld {
    constructor() {
        // Configuration for UI and API
        this.config = {
            baseUrl: process.env.PARABANK_BASE_URL || 'https://parabank.parasoft.com',
            apiBaseUrl: process.env.PARABANK_API_URL || 'https://parabank.parasoft.com/api'
        };

        this.testData = {}; // store test-specific data
        this.browser = null;
        this.context = null;
        this.page = null;
    }

    // Test data helpers
    setTestData(key, value) {
        this.testData[key] = value;
    }

    getTestData(key) {
        return this.testData[key];
    }

    // Browser helpers
    async initBrowser(headless = true) {
        this.browser = await chromium.launch({ headless });
        this.context = await this.browser.newContext();
        this.page = await this.context.newPage();
    }

    async closeBrowser() {
        if (this.browser) {
            await this.browser.close();
        }
    }

    // Generate unique user
    generateUniqueUserData() {
        const random = Math.floor(Math.random() * 100000);
        return {
            firstName: 'TestFirst' + random,
            lastName: 'TestLast' + random,
            address: '123 Main St',
            city: 'Anytown',
            state: 'CA',
            zipCode: '12345',
            phoneNumber: '555-1234',
            ssn: '123-45-6789',
            username: 'user' + random,
            password: 'Password123!'
        };
    }

    // **Allure helpers**
    async attachScreenshot(name = 'Screenshot') {
        if (this.page) {
            const buffer = await this.page.screenshot();
            // Add screenshot to Allure report
            addAttachment(name, buffer, 'image/png');
        }
    }

    async attachText(name, text) {
        addAttachment(name, text, 'text/plain');
    }

    async attachJson(name, obj) {
        addAttachment(name, JSON.stringify(obj, null, 2), 'application/json');
    }
}

setWorldConstructor(CustomWorld);
