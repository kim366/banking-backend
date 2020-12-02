import { TransactionRequest } from './guards';

type Iban = string;
type Username = string;

export interface AccountSubSchema {
  iban: Iban;
  balance: number;
  name: string;
  accountType: string;
}

export interface UserSchema {
  username: Username;
  derivedKey: Buffer;
  salt: Buffer;
  iterations: number;
  accounts: AccountSubSchema[];
  firstName: string;
  lastName: string;
  lastLogin: Date | null;
};

export type UserAttributes = Pick<UserSchema, 'username'>;

export interface AccountAttributes {
  iban: Iban;
}

export interface AccountSchema extends AccountAttributes, Pick<UserSchema, 'username' | 'firstName' | 'lastName'> {
  index: number;
}

export interface TransactionSchema extends TransactionRequest {}

export type TransactionAttributes = Pick<TransactionSchema, 'iban' | 'timestamp'>;
