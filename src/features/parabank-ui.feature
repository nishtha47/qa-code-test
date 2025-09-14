@ui
Feature: Parabank Application UI Testing
  As a banking customer
  I want to use the online banking system
  So that I can manage my accounts and perform banking operations

  Background:
    Given I navigate to Parabank application

  @smoke
  Scenario: User Registration and Login
    Given I am on the Parabank homepage
    When I click on Register link
    And I fill the registration form with unique user details
    And I submit the registration form
    Then I should see successful registration message
    And I should be logged in automatically

  @regression
  Scenario: Global Navigation Menu Validation
    Given I have registered and logged in with a new user
    When I verify the global navigation menu
    Then all navigation links should be present and functional
    And each menu item should navigate to correct page

  @account-creation
  Scenario: Create Savings Account
    Given I have registered and logged in with a new user
    When I navigate to "Open New Account" page
    And I select "SAVINGS" account type
    And I select an existing account to transfer from
    And I click "Open New Account" button
    Then I should see account creation success message
    And I should capture the new savings account number
    And the account should appear in accounts overview

  @account-management
  Scenario: Accounts Overview Validation
    Given I have registered and logged in with a new user
    And I have created a savings account
    When I navigate to "Accounts Overview" page
    Then I should see all my accounts listed
    And each account should display correct balance
    And account details should be accurate

  @fund-transfer
  Scenario: Fund Transfer Between Accounts
    Given I have registered and logged in with a new user
    And I have created a savings account
    When I navigate to "Transfer Funds" page
    And I enter amount "100.00" to transfer
    And I select source account
    And I select destination account
    And I click "Transfer" button
    Then I should see transfer success message
    And the transfer should be reflected in account balances
    And transaction should appear in transaction history

  @bill-payment
  Scenario: Bill Payment
    Given I have registered and logged in with a new user
    And I have created a savings account with sufficient balance
    When I navigate to "Bill Pay" page
    And I fill payee information:
      | field          | value            |
      | Payee Name     | Electric Company |
      | Address        | 123 Main St      |
      | City           | Anytown          |
      | State          | CA               |
      | Zip Code       | 12345            |
      | Phone          | 555-1234         |
      | Account Number | 987654321        |
      | Verify Account | 987654321        |
    And I enter payment amount "50.00"
    And I select account to pay from
    And I click "Send Payment" button
    Then I should see payment success message
    And the payment should be deducted from account balance
    And payment transaction should be recorded

  @end-to-end @workflow
  Scenario: Complete Banking Workflow
    Given I have registered and logged in with a new user
    When I verify the global navigation menu
    And I navigate to "Open New Account" page
    And I select "SAVINGS" account type
    And I select an existing account to transfer from
    And I click "Open New Account" button
    Then I should see account creation success message
    And I should capture the new savings account number
    And the account should appear in accounts overview
    When I navigate to "Transfer Funds" page
    And I enter amount "100.00" to transfer
    And I select source account
    And I select destination account
    And I click "Transfer" button
    Then I should see transfer success message
    When I navigate to "Bill Pay" page
    And I fill payee information:
      | field          | value            |
      | Payee Name     | Electric Company |
      | Address        | 123 Main St      |
      | City           | Anytown          |
      | State          | CA               |
      | Zip Code       | 12345            |
      | Phone          | 555-1234         |
      | Account Number | 987654321        |
      | Verify Account | 987654321        |
    And I enter payment amount "50.00"
    And I select account to pay from
    And I click "Send Payment" button
    Then I should see payment success message
    And all banking operations should be completed successfully
    And all transactions should be properly recorded
