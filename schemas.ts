type Iban = string;
type Username = string;

export interface AccountSubSchema {
  iban: Iban;
  balance: number;
  name: string;
  accountType: string;
}

export interface UserAttributes {
  username: Username;
}

export interface UserSchema extends UserAttributes {
  derivedKey: Buffer;
  salt: Buffer;
  iterations: number;
  accounts: AccountSubSchema[];
  firstName: string;
  lastName: string;
  lastLogin: Date | null;
};

export interface AccountAttributes {
  iban: Iban;
}

export interface AccountSchema extends AccountSubSchema, AccountAttributes {
  accountHolder: Username;
}
