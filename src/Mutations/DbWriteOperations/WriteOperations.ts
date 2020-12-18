import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import databaseClient from '../../Configuration/databaseClient';
import { PENDING_TRANSACTIONS_TABLE, USERS_TABLE } from '../../Configuration/Definitions';
import { TransactionAttributes, UserAttributes } from '../../Configuration/Attributes';
import { TransactionSchema } from '../../Configuration/Schemas';
import UserData from '../../Lib/UserData';

export async function updateLastLoginDate(key: UserAttributes, date: string): Promise<void> {
  await databaseClient.update({
    TableName: USERS_TABLE,
    Key: key,
    UpdateExpression: 'set lastLogin = :date',
    ExpressionAttributeValues: {
      ':date': date
    },
  }).promise();
}

export async function writeTransaction(
  items: DocumentClient.TransactWriteItem[],
): Promise<boolean> {
  let transactionCompleted = false;
  let numRetries = 0;
  let cancellationReasons: { Code: string, Message: string }[] | null = null;

  do {
    transactionCompleted = true;

    const databaseTransactionRequest = databaseClient.transactWrite({
      TransactItems: items
    });

    databaseTransactionRequest.on('extractError', response => {
      cancellationReasons = JSON.parse(response.httpResponse.body.toString()).CancellationReasons;

      if (cancellationReasons && cancellationReasons
        .filter(r => r.Code !== 'None')
        .some(r => r.Code !== 'TransactionConflict'))
      {
        throw response;
      } else {
        transactionCompleted = false;
      }
    });

    await new Promise((resolve, reject) => databaseTransactionRequest.send((err, response) => {
      if (err && !cancellationReasons) {
        return reject(err);
      }
      return resolve(response);
    }));

    ++numRetries;
  } while (!transactionCompleted && numRetries < 10);

  return transactionCompleted;
}

export async function deletePendingTransaction(key: TransactionAttributes): Promise<void> {
  await databaseClient.delete({
    Key: key,
    TableName: PENDING_TRANSACTIONS_TABLE,
  }).promise();
}

export function putPendingTransaction(data: TransactionSchema): Promise<DocumentClient.PutItemOutput> {
  return databaseClient.put({
    Item: data,
    TableName: PENDING_TRANSACTIONS_TABLE,
    ReturnValues: 'ALL_OLD',
  }).promise();
}

export async function writeUser(input: DocumentClient .TransactWriteItemsInput): Promise<void> {
  await databaseClient.transactWrite(input).promise();
}
