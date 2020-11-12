type Iban = string;

interface AccountSubSchema {
  Iban: Iban;
  Balance: number;
  Name: string;
  AccountType: string;
}

export interface UserAttributes {
  Username: string;
}

export interface UserSchema extends UserAttributes {
  DerivedKey: Buffer;
  Salt: Buffer;
  Iterations: number;
  Accounts: AccountSubSchema[];
  FirstName: string;
  LastName: string;
  LastLogin: Date | null;
};
