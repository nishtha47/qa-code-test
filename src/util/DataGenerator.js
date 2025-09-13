class DataGenerator {
  static generateUserData() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    
    return {
      firstName: `John${random}`,
      lastName: `Doe${random}`,
      username: `user${timestamp}${random}`,
      password: 'Password123!',
      confirmPassword: 'Password123!',
      address: `123 Test St ${random}`,
      city: 'TestCity',
      state: 'CA',
      zipCode: '12345',
      phone: `555-${String(random).padStart(4, '0')}`,
      ssn: `123-45-${String(random).padStart(4, '0')}`
    };
  }

  static generateSavingsAccount() {
    const accountNumber = Math.floor(Math.random() * 100000) + 10000;
    
    return {
      accountNumber: accountNumber.toString(),
      accountType: 'SAVINGS',
      balance: 100.00,
      availableBalance: 100.00,
      customerId: Math.floor(Math.random() * 10000)
    };
  }

  static generateSavingsAccountWithBalance(initialBalance) {
    const account = this.generateSavingsAccount();
    account.balance = initialBalance;
    account.availableBalance = initialBalance;
    
    return account;
  }

  static generateBillPayment(amount) {
    return {
      id: Math.floor(Math.random() * 10000),
      payeeName: 'Electric Company',
      amount: amount,
      accountId: '12345',
      date: new Date().toISOString().split('T')[0],
      type: 'Debit',
      description: 'Bill Payment'
    };
  }

  static generateMultipleTransactions(count = 10) {
    const transactions = [];
    const transactionTypes = ['Debit', 'Credit'];
    const descriptions = ['ATM Withdrawal', 'Direct Deposit', 'Bill Payment', 'Transfer', 'Purchase'];
    
    for (let i = 0; i < count; i++) {
      const transaction = {
        id: Math.floor(Math.random() * 100000),
        accountId: 12346,
        type: transactionTypes[Math.floor(Math.random() * transactionTypes.length)],
        date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        amount: parseFloat((Math.random() * 1000 + 10).toFixed(2)),
        description: descriptions[Math.floor(Math.random() * descriptions.length)]
      };
      
      transactions.push(transaction);
    }
    
    return transactions;
  }

  static generateBankingOperations() {
    return {
      accountCreated: true,
      transferCompleted: true,
      billPaymentMade: true,
      timestamp: new Date().toISOString()
    };
  }

  static generateWebTransactions() {
    return [
      {
        id: 1001,
        type: 'Transfer',
        amount: 100.00,
        date: new Date().toISOString().split('T')[0],
        description: 'Web Transfer'
      },
      {
        id: 1002,
        type: 'Bill Payment',
        amount: 50.00,
        date: new Date().toISOString().split('T')[0],
        description: 'Web Bill Payment'
      }
    ];
  }

  static generateTransactionHistory() {
    return this.generateMultipleTransactions(5);
  }
}

module.exports = DataGenerator;