import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { ACCOUNTS_TABLE, USERS_TABLE } from '../Configuration/Definitions';
import UserData from '../Lib/UserData';

export function createUserCreationQuery({ user, accounts }: UserData): DocumentClient.TransactWriteItemsInput {
  return {
    TransactItems: [
      {
        Put: {
          TableName: USERS_TABLE,
          Item: user,
        }
      },
      ...accounts.map(a => ({
        Put: {
          TableName: ACCOUNTS_TABLE,
          Item: a,
        }
      }))
    ]
  }
    
}