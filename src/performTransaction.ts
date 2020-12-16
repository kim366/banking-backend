import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { PENDING_TRANSACTIONS_TABLE, TOO_MANY_REQUESTS, TRANSACTIONS_TABLE, USERS_TABLE } from './definitions';
import ErrorResponse from './ErrorResponse';
import { TransactionAttributes, TransactionSchema, UserAttributes } from './schemas';
import { InvolvedParties, TransactionInfo, UpdateExpression } from './types';

function createTransactionKey({ iban, timestamp }: TransactionInfo): TransactionAttributes {
  return {
    iban,
    timestamp,
  };
}

function createTransactionEntries(
  info: TransactionInfo,
  key: TransactionAttributes,
): InvolvedParties<TransactionSchema> {
  const transaction: TransactionSchema = {
    ...key,
    amount: -info.amount,
    complementaryIban: info.complementaryIban,
    complementaryName: info.complementaryName,
    text: info.text,
    textType: info.textType,
    type: info.type,
  };

  const complementaryTransaction: TransactionSchema = {
    ...transaction,
    amount: info.amount,
    iban: info.complementaryIban,
    complementaryIban: info.iban,
    complementaryName: `${info.accounts.it.firstName} ${info.accounts.it.lastName}`,
  };

  return {
    it: transaction,
    complementary: complementaryTransaction,
  };
};

function createUserKeys({ accounts }: TransactionInfo): InvolvedParties<UserAttributes> {
  return {
    it: {
      username: accounts.it.username,
    },
    complementary: accounts.complementary === undefined
      ? undefined
      : {
        username: accounts.complementary.username,
      }
  };
}

function createBalanceChangeExpressions({ amount, accounts }: TransactionInfo): InvolvedParties<UpdateExpression> {
  return {
    it: {
      UpdateExpression: `add accounts[${accounts.it.index}].balance :amount`,
      ExpressionAttributeValues: {
        ':amount': -amount,
      },
    },
    complementary: accounts.complementary === undefined
      ? undefined
      : {
        UpdateExpression: `add accounts[${accounts.complementary.index}].balance :amount`,
        ExpressionAttributeValues: {
          ':amount': amount,
        }
      }
  };
}

function createTransactionItems(
  transactionKey: TransactionAttributes,
  userKeys: InvolvedParties<UserAttributes>,
  transactions: InvolvedParties<TransactionSchema>,
  balanceChanges: InvolvedParties<UpdateExpression>,
): DocumentClient.TransactWriteItem[] {
  
  const updateOperations: DocumentClient.TransactWriteItem[] = [
    {
      Put: {
        TableName: TRANSACTIONS_TABLE,
        Item: transactions.it,
      }
    },
    {
      Update: {
        TableName: USERS_TABLE,
        Key: userKeys.it,
        ...balanceChanges.it,
      }
    },
  ];

  const complementaryUpdateOperations: DocumentClient.TransactWriteItem[] =
    transactions.complementary === undefined || userKeys.complementary === undefined || balanceChanges.complementary === undefined
      ? []
      : [
        {
          Put: {
            TableName: TRANSACTIONS_TABLE,
            Item: transactions.complementary,
          }
        },
        {
          Update: {
            TableName: USERS_TABLE,
            Key: userKeys.complementary,
            ...balanceChanges.complementary
          }
        },
      ];

  const deleteFromPendingOperation: DocumentClient.TransactWriteItem = {
    Delete: {
      Key: transactionKey,
      TableName: PENDING_TRANSACTIONS_TABLE,
    }
  };
  
  return [
    ...updateOperations,
    ...complementaryUpdateOperations,
    deleteFromPendingOperation,
  ];
}

export default async function performTransaction(
  client: DocumentClient,
  info: TransactionInfo,
  force = false,
): Promise<void> {
  const key = createTransactionKey(info);
  const transactions = createTransactionEntries(info, key);  
  const userKeys = createUserKeys(info);
  const balanceChanges = createBalanceChangeExpressions(info);
  const transactionItems = createTransactionItems(key, userKeys, transactions, balanceChanges);
  console.log(balanceChanges)

  let transactionCompleted = false;
  let numRetries = 0;

  let cancellationReasons: { Code: string, Message: string }[] | null = null;

  do {
    transactionCompleted = true;

    const databaseTransactionRequest = client.transactWrite({
      TransactItems: transactionItems
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

  if (!transactionCompleted) {
    throw new ErrorResponse(TOO_MANY_REQUESTS, 'too many requests');
  }
}
