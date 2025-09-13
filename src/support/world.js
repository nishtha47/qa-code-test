const { setWorldConstructor, World } = require('@cucumber/cucumber');
const { chromium } = require('playwright');
const fs = require('fs');

class CustomWorld extends World {
    constructor(options) {
        super(options);
        this.browser = null;
        this.page = null;
        this.config = { baseUrl: 'https://parabank.parasoft.com' };
        this.testData = {};
    }

    async initBrowser() {
        this.browser = await chromium.launch({ headless: false });
        this.page = await this.browser.newPage();
    }

    async closeBrowser() {
        if (this.browser) await this.browser.close();
    }

    setTestData(key, value) {
        this.testData[key] = value;
    }

    getTestData(key) {
        return this.testData[key];
    }

    async attachScreenshot(name) {
        if (this.page) {
            const buffer = await this.page.screenshot();
            if (this.attach) {
                await this.attach(buffer, 'image/png');
            }
        }
    }

    // -------------------- Allure helper --------------------
    async allureStep(name, stepFn) {
        if (!this.attach) return stepFn(); // fallback if Allure not attached
        try {
            await stepFn();
        } catch (err) {
            throw err;
        }
    }

    async attachJson(name, obj) {
        if (this.attach) {
            await this.attach(JSON.stringify(obj, null, 2), 'application/json');
        }
    }

    generateUniqueUserData() {
        const random = Math.floor(Math.random() * 10000);
        return {
            firstName: `TestFirst${random}`,
            lastName: `TestLast${random}`,
            address: '123 Test St',
            city: 'TestCity',
            state: 'CA',
            zipCode: '12345',
            phoneNumber: '123-456-7890',
            ssn: `${Math.floor(100000000 + Math.random() * 900000000)}`,
            username: `user${random}`,
            password: 'Password123!'
        };
    }
}

setWorldConstructor(CustomWorld);
