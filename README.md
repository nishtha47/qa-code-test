# Cucumber Playwright JavaScript Automation Project

Welcome to the **Cucumber Playwright JavaScript Automation Project**! This project provides a comprehensive automation solution using Cucumber, Playwright, and JavaScript to test web applications. With these powerful tools, you can easily create and execute automated tests for web applications, ensuring their functionality and quality.

## Table of Contents

- [Introduction](#introduction)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Running Tests](#running-tests)
- [Generating Reports](#generating-reports)

## Introduction

This project is designed to showcase how to use Cucumber, Playwright, and JavaScript to automate the testing of web applications. It offers a structured testing framework using BDD (Behavior-Driven Development) principles, making it easy to write test scenarios in natural language and convert them into executable tests.

## Getting Started

Before you can run the tests and generate reports, there are a few prerequisites and installation steps you need to follow.

### Prerequisites

1. **Node.js**: Ensure you have Node.js installed on your machine. You can download it from the official website: [https://nodejs.org/](https://nodejs.org/)

2. **Git**: You'll need Git to clone the project repository. You can download Git from: [https://git-scm.com/](https://git-scm.com/)

### Installation

Follow these steps to set up the project on your machine:

1. **Clone the Repository**: Open your terminal/command prompt and navigate to a directory where you want to store the project. Run the following command to clone the repository:

   ```bash
   git clone https://github.com/imsaqibhussain/cucumber-playwright-javascript.git
   ```

2. **Navigate to the Project Directory**: Change your current directory to the cloned project folder:

   ```bash
   cd cucumber-playwright-javascript
   ```

3. **Install Dependencies**: Install the project's dependencies using npm (Node Package Manager). Run the following command:

   ```bash
   npm install
   ```

## Running Tests

To execute the automated tests, follow these steps:

1. Open your terminal/command prompt.

2. Navigate to the project directory if you're not already there:

   ```bash
   cd path/to/cucumber-playwright-javascript
   ```

3. Run the following command to execute the tests using Cucumber and Playwright:

   ```bash
   npm run test:login.feature
   ```

   This command will run the tests specified in the `login.feature` file using the Cucumber framework and Playwright browser automation.

## Generating Reports

After running the tests, you can generate a detailed HTML report using the following steps:

1. Open your terminal/command prompt.

2. Navigate to the project directory if you're not already there:

   ```bash
   cd path/to/cucumber-playwright-javascript
   ```

3. Run the following command to generate the HTML report:

   ```bash
   node cucumber-html-reporter.js
   ```

   This command will generate an HTML report that provides an overview of the test execution results, including passed and failed scenarios, steps, and execution times.

Congratulations! You've successfully set up and executed automated tests using the Cucumber Playwright JavaScript Automation Project. Feel free to explore the project, modify the test scenarios, and adapt it to your own web application testing needs.

For any further assistance or inquiries, please refer to the project's documentation or reach out to the project owner [imsaqibhussain](https://github.com/imsaqibhussain).
