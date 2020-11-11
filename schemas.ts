type Iban = string;

interface AccountAttributes {
  Iban: Iban;
}

interface AccountSchema extends AccountAttributes {
  Balance: number;
  Name: string;
  AccountType: string;
}

interface UserAttributes {
  Username: string;
}

interface UserSchema extends UserAttributes {
  Key: Buffer;
  Salt: Buffer;
  Iterations: number;
  Accounts: Iban[];
  FirstName: string;
  LastName: string;
  LastLogin: Date | null;
};
