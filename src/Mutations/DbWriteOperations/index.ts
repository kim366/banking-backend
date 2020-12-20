import { createTransactionKey, createUserKey } from '../../Configuration/Attributes';
import { createTransactionQuery } from '../../Queries/TransactionQueries';
import { TransactionInfo } from '../../Configuration/Types';
import UserData from '../../Lib/UserData';
import { deletePendingTransaction, updateLastLoginDate, writeTransaction, writeUser } from './WriteOperations';
import { createUserCreationQuery } from '../../Queries/CreateUserQueries';

export { putPendingTransaction } from './WriteOperations';

export function updateLastLoginDateByUserName(username: string, date: string): Promise<void> {
  const key = createUserKey(username);
  return updateLastLoginDate(key, date);
}

export function writeTransactionByInfo(info: TransactionInfo, deletionTime: string) {
  const query = createTransactionQuery(info, deletionTime);
  return writeTransaction(query);
}

export function deletePendingTransactionByInfo(info: TransactionInfo): Promise<void> {
  const key = createTransactionKey(info.iban, info.timestamp);
  return deletePendingTransaction(key);
}

export function createUserByData(data: UserData) {
  const input = createUserCreationQuery(data);
  return writeUser(input);
}
