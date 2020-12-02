import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { TransactionSchema } from './schemas';
import { CREATED, NO_CONTENT, PENDING_TRANSACTIONS_TABLE } from './definitions';
import { TransactionInfo } from './types';

function createTransactionData(info: TransactionInfo): TransactionSchema {
  return {
    iban: info.iban,
    timestamp: info.timestamp,
    amount: info.amount,
    complementaryIban: info.complementaryIban,
    complementaryName: info.complementaryName,
    text: info.text,
    textType: info.textType,
    type: info.type,
  };
}

function getStatusCodeFromPut(put: DocumentClient.PutItemOutput): number {
  return put.Attributes ? NO_CONTENT : CREATED;
}

export default async function savePendingTransaction(client: DocumentClient, info: TransactionInfo): Promise<number> {
  const put = await client.put({
    Item: createTransactionData(info),
    TableName: PENDING_TRANSACTIONS_TABLE,
    ReturnValues: 'ALL_OLD',
  }).promise();

  return getStatusCodeFromPut(put);
}
