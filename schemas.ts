type Iban = string;

interface AccountSubSchema {
  iban: Iban;
  balance: number;
  name: string;
  accountType: string;
}

export interface UserAttributes {
  username: string;
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
