// In src/support/hooks.js
const { Before, After, AfterStep } = require('@cucumber/cucumber');

Before(async function() {
  console.log('Setting up test scenario...');
  // Initialize browser if it's a UI test
  if (this.scenario && this.scenario.pickle.tags.some(tag => tag.name === '@ui')) {
    await this.openBrowser();
  }
});

After(async function(scenario) {
  // Take screenshot on failure
  if (scenario.result.status === 'FAILED' && this.page) {
    try {
      const screenshot = await this.page.screenshot({ fullPage: true });
      this.attach(screenshot, 'image/png');
    } catch (error) {
      console.log(`Failed to take screenshot: ${error.message}`);
    }
  }
  
  // Clean up
  if (this.browser) {
    await this.closeBrowser();
  }
  
  console.log(`Cleaning up after scenario: ${scenario.pickle.name}`);
});

AfterStep(async function(step) {
  // Optional: Take screenshot after each step
  if (this.page && process.env.SCREENSHOT_ON_STEP === 'true') {
    try {
      const screenshot = await this.page.screenshot({ fullPage: true });
      this.attach(screenshot, 'image/png');
    } catch (error) {
      console.log(`Failed to take step screenshot: ${error.message}`);
    }
  }
});