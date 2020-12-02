import { TransactionAttributes } from './schemas';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { PENDING_TRANSACTIONS_TABLE } from './definitions';
import { TransactionInfo } from './types';

function createTransactionKey({ iban, timestamp }: TransactionInfo): TransactionAttributes {
  return {
    iban,
    timestamp,
  }
};

export default async function deletePendingTransaction(client: DocumentClient, info: TransactionInfo): Promise<void> {
  await client.delete({
    Key: createTransactionKey(info),
    TableName: PENDING_TRANSACTIONS_TABLE,
  }).promise();
}
