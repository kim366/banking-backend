import { TransactionInfo, TransactionListInfo, UpdateExpression } from '../Configuration/Types';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import InvolvedParties from '../Lib/InvolvedParties';
import { TransactionSchema } from '../Configuration/Schemas';
import { PENDING_TRANSACTIONS_TABLE, TRANSACTIONS_TABLE, USERS_TABLE } from '../Configuration/Definitions';
import { TransactionAttributes, createTransactionKey, UserAttributes, createUserKey } from '../Configuration/Attributes';

export function createTransactionQuery(info: TransactionInfo) {
  const key = createTransactionKey(info.iban, info.timestamp);
  
  return createTransactionItems(
    key,
    createUserKeys(info),
    createTransactionEntries(info, key),
    createBalanceChangeExpressions(info)
  );
}

export function createTransactionItems(
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
        }
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
    it: createUserKey(accounts.it.username),
    complementary: accounts.complementary === undefined
      ? undefined
      : createUserKey(accounts.complementary.username),
  };
}
