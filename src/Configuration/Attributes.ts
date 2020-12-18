import { TransactionSchema } from './Schemas';

export interface UserAttributes {
  username: string;
}

export interface AccountAttributes {
  iban: string;
}

export type TransactionAttributes = Pick<TransactionSchema, 'iban' | 'timestamp'>;

export function createUserKey(username: string): UserAttributes {
  return {
    username,
  };
}

export function createAccountKey(iban: string): AccountAttributes {
  return {
    iban,
  }
}

export function createTransactionKey(iban: string, timestamp: string): TransactionAttributes {
  return {
    iban,
    timestamp,
  };
}
