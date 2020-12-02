import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { TransactionAttributes, TransactionSchema } from './schemas';
import { PENDING_TRANSACTIONS_TABLE, TRANSACTIONS_TABLE } from './definitions';
import { ConditionExpression, TransactionListInfo } from './types';

interface TransactionQueryOutput extends DocumentClient.QueryOutput {
  Items?: TransactionSchema[];
  LastEvaluatedKey?: TransactionAttributes;
}

function createIbanConditionExpression({ iban }: TransactionListInfo): ConditionExpression {
  return {
    KeyConditionExpression: 'iban = :iban',
    ExpressionAttributeValues: {
      ':iban': iban,
    }
  };
}

function createExlusiveTransactionStartKey(
  exclusiveDate: string,
  iban: string,
): { ExclusiveStartKey: TransactionAttributes } {
  return {
    ExclusiveStartKey: {
      iban,
      timestamp: exclusiveDate,
    }
  };
}

function updateTransactionParamsForPagination(params: DocumentClient.QueryInput, { exclusiveDate, iban }: TransactionListInfo): DocumentClient.QueryInput {
  const startKey = exclusiveDate
    ? createExlusiveTransactionStartKey(exclusiveDate, iban)
    : {};

  return {
    ...params,
    ...startKey,
  }
}

function fetchTransactions(client: DocumentClient, info: TransactionListInfo): Promise<TransactionQueryOutput> {
  const transactionParams: DocumentClient.QueryInput = {
    TableName: info.stored ? PENDING_TRANSACTIONS_TABLE : TRANSACTIONS_TABLE,
    Limit: info.n,
    ...createIbanConditionExpression(info),
  };

  const transactionParamsWithPagination = updateTransactionParamsForPagination(transactionParams, info);

  return client.query(transactionParamsWithPagination).promise() as Promise<TransactionQueryOutput>;
}

function stringifyTransactions(transactions: TransactionQueryOutput) {
  return JSON.stringify({
    transactions: transactions.Items,
    lastDate: transactions.LastEvaluatedKey?.timestamp,
  });
}

export default async function getStringifiedTransactionsWithPagination(client: DocumentClient, info: TransactionListInfo): Promise<string> {
  const transactions = await fetchTransactions(client, info);
  
  return stringifyTransactions(transactions);
}