@api
Feature: Parabank API Automation
  As a developer
  I want to test Parabank API endpoints
  So that I can ensure API functionality works correctly

  Background:
    Given I have API client configured for Parabank

  @api @transactions @search
  Scenario: Find Transactions by Amount
    Given I have a user account with transaction history
    And I have made a bill payment of "50.00"
    When I search for transactions using "Find Transactions" API
    And I filter by amount "50.00"
    Then I should receive a valid JSON response
    And the response should contain transaction details
    And transaction amount should match "50.00"
    And transaction type should be "Debit"

  @api @transactions @validation
  Scenario: Validate Transaction Response Structure
    Given I have a user account with transaction history
    When I search for transactions using "Find Transactions" API
    Then the JSON response should have correct structure
    And response should contain required fields:
      | field       | type   |
      | id          | number |
      | accountId   | number |
      | type        | string |
      | date        | string |
      | amount      | number |
      | description | string |
    And all date fields should be in valid format
    And all amount fields should be numeric

  @api @transactions @filter
  Scenario Outline: Find Transactions by Different Criteria
    Given I have a user account with multiple transactions
    When I search for transactions by "<criteria>" with value "<value>"
    Then I should receive filtered results
    And all returned transactions should match the "<criteria>"

    Examples:
      | criteria      | value    |
      | amount        | 100.00   |
      | type          | Debit    |
      | type          | Credit   |

  @api @accounts @balance
  Scenario: Validate Account Balance via API
    Given I have created accounts through UI
    When I fetch account details via API
    Then account balance should match UI displayed balance
    And account information should be consistent
    And API response time should be under 2 seconds

  @api @error-handling
  Scenario: API Error Handling
    Given I have API client configured
    When I make invalid API requests:
      | request_type        | expected_status |
      | Invalid account ID  | 404            |
      | Missing parameters  | 400            |
      | Invalid amount      | 400            |
    Then I should receive appropriate error responses
    And error messages should be descriptive
    And response format should be consistent

  @api @integration
  Scenario: UI and API Data Consistency
    Given I have performed banking operations via UI
    And I have made transactions through the web interface
    When I fetch the same data via API calls
    Then UI and API data should be consistent
    And transaction details should match exactly
    And account balances should be synchronized