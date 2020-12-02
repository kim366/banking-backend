import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { TransactionAttributes, TransactionSchema, UserAttributes } from './schemas';
import { PENDING_TRANSACTIONS_TABLE, TRANSACTIONS_TABLE, USERS_TABLE } from './definitions';
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
    complementary: {
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
    complementary: {
      UpdateExpression: `add accounts[${accounts.complementary.index}].balance :amount`,
      ExpressionAttributeValues: {
        ':amount': amount,
      }
    }
  };
}

export default async function performTransaction(
  client: DocumentClient,
  info: TransactionInfo,
): Promise<void> {
  const key = createTransactionKey(info);
  const transactions = createTransactionEntries(info, key);
  const userKeys = createUserKeys(info);
  const balanceChanges = createBalanceChangeExpressions(info);

  await client.transactWrite({
    TransactItems: [
      {
        Put: {
          TableName: TRANSACTIONS_TABLE,
          Item: transactions.it,
        }
      },
      {
        Put: {
          TableName: TRANSACTIONS_TABLE,
          Item: transactions.complementary,
        }
      },
      {
        Update: {
          TableName: USERS_TABLE,
          Key: userKeys.it,
          ...balanceChanges.it,
        }
      },
      {
        Update: {
          TableName: USERS_TABLE,
          Key: userKeys.complementary,
          ...balanceChanges.complementary
        }
      },
      {
        Delete: {
          Key: key,
          TableName: PENDING_TRANSACTIONS_TABLE,
        }
      }
    ]
  }).promise();
}