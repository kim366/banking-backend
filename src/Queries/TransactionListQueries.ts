import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { TransactionListInfo } from '../Configuration/Types';
import { PENDING_TRANSACTIONS_TABLE, TRANSACTIONS_TABLE } from '../Configuration/Definitions';

export function createTransactionListQuery(info: TransactionListInfo): DocumentClient.QueryInput {
  const startKey = info.exclusiveDate
    ? {
      ExclusiveStartKey: {
        iban: info.iban,
        timestamp: info.exclusiveDate,
      },
    }
    : {};
  
  return {
    KeyConditionExpression: 'iban = :iban',
    ExpressionAttributeValues: {
      ':iban': info.iban,
    },
    TableName: info.stored ? PENDING_TRANSACTIONS_TABLE : TRANSACTIONS_TABLE,
    Limit: info.n,
    ...startKey,
  };
}
