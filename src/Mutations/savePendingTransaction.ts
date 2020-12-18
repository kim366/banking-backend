import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { TransactionSchema } from '../Configuration/Schemas';
import { CREATED, NO_CONTENT, PENDING_TRANSACTIONS_TABLE } from '../Configuration/Definitions';
import { TransactionInfo } from '../Configuration/Types';
import databaseClient from '../Configuration/databaseClient';
import { putPendingTransaction } from './DbWriteOperations';

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

export default async function savePendingTransaction(info: TransactionInfo): Promise<number> {
  const data = createTransactionData(info);
  const put = await putPendingTransaction(data);

  return getStatusCodeFromPut(put);
}
