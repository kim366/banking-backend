import { TransactionRequest } from './Guards';
import { AccountAttributes, UserAttributes } from './Attributes';

export interface AccountSubSchema {
  iban: string;
  balance: number;
  limit?: number;
  name: string;
  accountType: string;
}

export interface UserSchema extends UserAttributes {
  derivedKey: Buffer;
  salt: Buffer;
  iterations: number;
  accounts: AccountSubSchema[];
  firstName: string;
  lastName: string;
  lastLogin: string | null;
};

export interface UserSchemaWithSpecifiedLastLogin extends UserSchema {
  lastLogin: string;
}

export interface AccountSchema extends AccountAttributes, Pick<UserSchema, 'username' | 'firstName' | 'lastName'> {
  index: number;
}

export interface TransactionSchema extends TransactionRequest {}
