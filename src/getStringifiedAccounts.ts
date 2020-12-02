import { APIGatewayProxyEvent } from 'aws-lambda';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { UserAttributes, UserSchema } from './schemas';
import { USERS_TABLE } from './definitions';
import parseToken from './parseToken';
import { TokenPayload } from './types';

function createUserKey(payload: TokenPayload): UserAttributes {
  return {
    username: payload.username,
  };
}

async function fetchPartialUser(client: DocumentClient, key: UserAttributes): Promise<Pick<UserSchema, 'accounts'>> {
  return (await client.get({
    TableName: USERS_TABLE,
    Key: key,
    ProjectionExpression:                'accounts'
  }).promise()).Item as Pick<UserSchema, 'accounts'>;
}

function stringifyAccounts(user: Pick<UserSchema, 'accounts'>): string {
  return JSON.stringify({
    accounts: user.accounts,
  });
}

export default async function getStringifiedAccounts(client: DocumentClient, event: APIGatewayProxyEvent): Promise<string> {
  const payload = parseToken(event);
  const key = createUserKey(payload);
  const user = await fetchPartialUser(client, key);
  return stringifyAccounts(user);
}
