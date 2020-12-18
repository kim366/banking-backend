import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { AccountSchema, UserSchema } from '../Configuration/Schemas';
import { ACCOUNTS_TABLE, USERS_TABLE } from '../Configuration/Definitions';
import UserData from '../Lib/UserData';
import databaseClient from '../Configuration/databaseClient';
import { createUserByData } from './DbWriteOperations';

export default async function createUser(
  userData: UserData,
): Promise<void> {
  return createUserByData(userData);
}
