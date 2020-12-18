import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import ErrorResponse from './ErrorResponse';
import { TransactionAttributes, TransactionSchema, UserAttributes } from './schemas';
import { EventBridge, Lambda } from 'aws-sdk';
import { FULFIL_TRANSACTION_ARN, PENDING_TRANSACTIONS_TABLE, TOO_MANY_REQUESTS, TRANSACTIONS_TABLE, USERS_TABLE, STAGE, ACCEPTED, OK, FULFIL_TRANSACTION_NAME } from './definitions';
import { InvolvedParties, TransactionInfo, UpdateExpression } from './types';
import isoNow from './isoNow';

const eventBridge = new EventBridge();

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
  const baseBalanceChange: UpdateExpression = {
    UpdateExpression: `add accounts[${accounts.it.index}].balance :amount`,
    ExpressionAttributeValues: {
      ':amount': -amount,
    },
  };

  const complementaryUpdateExpression = `accounts[${accounts.complementary?.index}].balance :complementaryAmount`;

  const complementaryBalanceChange: UpdateExpression = {
    UpdateExpression: 'add ' + complementaryUpdateExpression,
    ExpressionAttributeValues: {
      ':complementaryAmount': amount,
    },
  };

  if (accounts.it.username === accounts.complementary?.username) {
    return {
      it: {
        UpdateExpression: baseBalanceChange.UpdateExpression
          + ', ' + complementaryUpdateExpression,
        ExpressionAttributeValues: {
          ...baseBalanceChange.ExpressionAttributeValues,
          ...complementaryBalanceChange.ExpressionAttributeValues,
        },
      }
    }
  }
  
  return {
    it: baseBalanceChange,
    complementary: accounts.complementary === undefined
      ? undefined
      : complementaryBalanceChange
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
    transactions.complementary === undefined || userKeys.complementary === undefined
      ? []
      : [
          {
            Put: {
              TableName: TRANSACTIONS_TABLE,
              Item: transactions.complementary,
            }
          },
          ...balanceChanges.complementary === undefined
          ? []
          : [
            {
              Update: {
                TableName: USERS_TABLE,
                Key: userKeys.complementary,
                ...balanceChanges.complementary,
              }
            }
          ],
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

async function writeTransaction(
  client: DocumentClient,
  items: DocumentClient.TransactWriteItem[],
): Promise<boolean> {
  let transactionCompleted = false;
  let numRetries = 0;
  let cancellationReasons: { Code: string, Message: string }[] | null = null;

  do {
    transactionCompleted = true;

    const databaseTransactionRequest = client.transactWrite({
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

function ensureTransactionWasSuccessful(isSuccessful: boolean) {
  if (!isSuccessful) {
    throw new ErrorResponse(TOO_MANY_REQUESTS, 'too many requests');
  }
}

function createScheduleExpression(date: Date) {
  const mins = date.getUTCMinutes();
  const hrs = date.getUTCHours();
  const day = date.getUTCDate();
  const month = date.getUTCMonth() + 1;
  const weekDay = '?';
  const year = date.getUTCFullYear();

  return `cron(${mins} ${hrs} ${day} ${month} ${weekDay} ${year})`;
}

function createId(info: TransactionInfo, prefix: string) {
  return `${prefix}_${info.iban}_${info.timestamp}`.replace(/[^_A-Za-z0-9]/g, '_');
}

async function scheduleFutureTransaction(info: TransactionInfo) {
  const lambda = new Lambda();

  const date = new Date(info.timestamp);
  const eventName = createId(info, 'Transact');
  const permissionName = createId(info, 'Perm');
  const targetName = createId(info, 'Target');

  const ruleArn = (await eventBridge.putRule({
    Name: eventName,
    Description: `Transaction of ${info.amount} from ${info.iban} to ${info.complementaryIban} on ${date.toLocaleString('de')}`,
    ScheduleExpression: createScheduleExpression(date),
  }).promise()).RuleArn;

  await lambda.addPermission({
    Action: 'lambda:InvokeFunction',
    FunctionName: FULFIL_TRANSACTION_NAME,
    Principal: 'events.amazonaws.com',
    SourceArn: ruleArn,
    StatementId: permissionName,
  }).promise();

  await eventBridge.putTargets({
    Rule: eventName,
    Targets: [
      {
        Arn: FULFIL_TRANSACTION_ARN,
        Id: targetName,
        Input: JSON.stringify({
          ...info,
          event: eventName,
          target: targetName,
        }),
      }
    ]
  }).promise();
}

async function deleteEvent({ event, target }: TransactionInfo): Promise<void> {
  if (event && target) {
    await eventBridge.removeTargets({
      Rule: event,
      Ids: [
        target,
      ],
    }).promise();

    await eventBridge.deleteRule({
      Name: event,
    }).promise(); 
  }
}

export default async function performTransaction(
  client: DocumentClient,
  info: TransactionInfo,
  force = false,
): Promise<number> {
  const now = isoNow();
  const amortizedNow = isoNow(180);

  if (info.timestamp < amortizedNow) {
    info.timestamp = now;

    await deleteEvent(info);

    const key = createTransactionKey(info);
    const transactions = createTransactionEntries(info, key);
    const userKeys = createUserKeys(info);
    const balanceChanges = createBalanceChangeExpressions(info);
    const transactionItems = createTransactionItems(key, userKeys, transactions, balanceChanges);
  
    const isSuccessful = await writeTransaction(client, transactionItems);
    ensureTransactionWasSuccessful(isSuccessful);

    return OK;
  } else {
    await scheduleFutureTransaction(info);

    return ACCEPTED;
  }
}
