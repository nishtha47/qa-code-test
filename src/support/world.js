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
        this.apiResponse = { transactions: [] }; // ✅ always initialize with transactions array
    }

    // -------------------- Browser Helpers --------------------
    async initBrowser() {
        this.browser = await chromium.launch({ headless: false });
        this.page = await this.browser.newPage();
    }

    async closeBrowser() {
        if (this.browser) await this.browser.close();
    }

    // -------------------- Test Data Helpers --------------------
    setTestData(key, value) {
        this.testData[key] = value;
    }

    getTestData(key) {
        return this.testData[key];
    }

    // -------------------- Attachments --------------------
    async attachScreenshot(name) {
        if (this.page) {
            const buffer = await this.page.screenshot();
            if (this.attach) {
                await this.attach(buffer, 'image/png');
            }
        }
    }

    async attachJson(name, obj) {
        if (this.attach) {
            await this.attach(JSON.stringify(obj, null, 2), 'application/json');
        }
    }

    // -------------------- Allure Helpers --------------------
    async allureStep(name, stepFn) {
        if (!this.attach) return stepFn(); // fallback if Allure not attached
        try {
            await stepFn();
        } catch (err) {
            throw err;
        }
    }

    // -------------------- API Helpers --------------------
    setApiResponse(response) {
        // ✅ Ensure transactions always exist, default empty array
        this.apiResponse = {
            ...response,
            transactions: response?.transactions || []
        };
    }

    getApiResponse() {
        return this.apiResponse;
    }

    // ✅ Normalize numeric fields (id, accountId) even if strings
    normalizeTransactionFields(txns) {
        return (txns || []).map(txn => ({
            ...txn,
            id: Number(txn.id),
            accountId: Number(txn.accountId)
        }));
    }

    // -------------------- Test Data Generators --------------------
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
