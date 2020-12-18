import { createAccountKey, createUserKey } from '../../Configuration/Attributes';
import { TransactionListInfo, TransactionQueryOutput } from '../../Configuration/Types';
import { fetchUser, fetchTransactions, fetchAccounts, fetchAccount, fetchAccountBatch } from './ReadOperations';

export function fetchUserByUsername(username: string) {
  const key = createUserKey(username);
  return fetchUser(key);
}

export function listTransactions(info: TransactionListInfo): Promise<TransactionQueryOutput> {
  return fetchTransactions(info);
}

export function getAccountByIban(iban: string) {
  const key = createAccountKey(iban);
  return fetchAccount(key);
}

export function listAccountsByUsername(username: string) {
  const key = createUserKey(username);
  return fetchAccounts(key);
}

export function getMultipleAccountsByIban(ibans: string[]) {
  const keys = ibans.map(createAccountKey);
  return fetchAccountBatch(keys);
}
