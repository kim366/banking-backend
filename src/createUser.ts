import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { AccountSchema, UserSchema } from './schemas';
import { ACCOUNTS_TABLE, USERS_TABLE } from './definitions';

export default async function createUser(
  client: DocumentClient,
  info: UserSchema,
  accounts: AccountSchema[],
): Promise<void> {
  await client.transactWrite({
    TransactItems: [
      {
        Put: {
          TableName: USERS_TABLE,
          Item: info,
        }
      },
      ...accounts.map(a => ({
        Put: {
          TableName: ACCOUNTS_TABLE,
          Item: a,
        }
      }))
    ]
  }).promise();
}
