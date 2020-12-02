import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { USERS_TABLE } from './definitions';
import { LoginInfo } from './types';

function isoNow() {
  return new Date().toISOString();
}

async function updateLastLoginDate(
  client: DocumentClient,
  { key }: LoginInfo,
  now: string,
): Promise<void> {  
  await client.update({
    TableName: USERS_TABLE,
    Key: key,
    UpdateExpression: 'set lastLogin = :now',
    ExpressionAttributeValues: { ':now': now },
  }).promise();
}

function stringifyUserData({ user, token }: LoginInfo, now: string) {
  return JSON.stringify({
    token,
    lastLogin: user.lastLogin ?? now,
    firstName: user.firstName,
    lastName: user.lastName,
    accounts: user.accounts.map(a => a.iban),
  });
}

export default async function performLogin(client: DocumentClient, info: LoginInfo) {
  const now = isoNow();

  updateLastLoginDate(client, info, now);
  
  return stringifyUserData(info, now);
} 