import { AccountAttributes, UserAttributes } from '../../Configuration/Attributes';
import databaseClient from '../../Configuration/databaseClient';
import { ACCOUNTS_TABLE, USERS_TABLE } from '../../Configuration/Definitions';
import { AccountSchema, AccountSubSchema, UserSchema } from '../../Configuration/Schemas';
import { createTransactionListQuery } from '../../Queries/TransactionListQueries';
import UnreachableCodeException from '../../Exceptions/UnreachableCodeException';
import { TransactionListInfo, TransactionQueryOutput } from '../../Configuration/Types';

export async function fetchUser(key: UserAttributes): Promise<UserSchema | undefined> {
  return (await databaseClient.get({
    TableName: USERS_TABLE,
    Key: key,
  }).promise()).Item as UserSchema | undefined;
}

export function fetchTransactions(info: TransactionListInfo): Promise<TransactionQueryOutput> {
  const query = createTransactionListQuery(info);

  return databaseClient.query(query).promise() as Promise<TransactionQueryOutput>;
}

export async function fetchAccount(key: AccountAttributes): Promise<AccountSchema | undefined> {
  return (await databaseClient.get({
    TableName: ACCOUNTS_TABLE,
    Key: key
  }).promise()).Item as AccountSchema | undefined;
}

export async function fetchAccountBatch(keys: AccountAttributes[]): Promise<AccountSchema[] | undefined> {
  return (await databaseClient.batchGet({
    RequestItems: {
      [ACCOUNTS_TABLE]: {
        Keys: keys,
      }
    }
  }).promise()).Responses?.[ACCOUNTS_TABLE] as AccountSchema[] | undefined;
}

export async function fetchAccounts(key: UserAttributes): Promise<AccountSubSchema[]> {
  const user = (await databaseClient.get({
    TableName: USERS_TABLE,
    Key: key,
    ProjectionExpression:                'accounts'
  }).promise()).Item as Pick<UserSchema, 'accounts'> | undefined;

  if (!user) {
    throw new UnreachableCodeException(`A corresponding user was not found for account ${key.username}`);
  }

  return user.accounts;
}
