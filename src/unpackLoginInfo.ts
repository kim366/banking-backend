import { APIGatewayProxyEvent } from 'aws-lambda';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import * as jwt from 'jsonwebtoken';
import { BAD_REQUEST, SECRET, UNAUTHORIZED, USERS_TABLE } from './definitions';
import deriveKey from './deriveKey';
import ErrorResponse from './ErrorResponse';
import { EventWithBody, LoginRequest } from './guards';
import { UserAttributes, UserSchema } from './schemas';
import { LoginInfo, TokenPayload } from './types';

function parseRequest(event: APIGatewayProxyEvent): LoginRequest {
  if (!EventWithBody.guard(event)) {
    throw new ErrorResponse(BAD_REQUEST, 'no body provided');
  }

  const request: unknown = JSON.parse(event.body);

  if (!LoginRequest.guard(request)) {
    throw new ErrorResponse(BAD_REQUEST, 'invalid form');
  }

  return request;
}

function createUserKey({ username }: LoginRequest): UserAttributes {
  return {
    username,
  };
}

async function fetchUser(client: DocumentClient, key: UserAttributes): Promise<UserSchema | undefined> {
  return (await client.get({
    TableName: USERS_TABLE,
    Key: key,
  }).promise()).Item as UserSchema | undefined;
}

async function verifyPassword(request: LoginRequest, user: UserSchema): Promise<void> {
  const providedKey = await deriveKey(request.password, user.salt, user.iterations);

  if (!user.derivedKey.equals(providedKey)) {
    throw new ErrorResponse (UNAUTHORIZED, 'invalid credentials');
  }
}

async function verifyCredentials(request: LoginRequest, user: UserSchema | undefined): Promise<void> {
  if (!user) {
    throw new ErrorResponse(UNAUTHORIZED, 'invalid credentials')
  }

  verifyPassword(request, user);
}

function createToken({ username }: LoginRequest): string {
  const payload: TokenPayload = {
    username,
  };

  return jwt.sign(payload, SECRET);
}

export default async function unpackLoginInfo(client: DocumentClient, event: APIGatewayProxyEvent): Promise<LoginInfo> {
  const request = parseRequest(event);
  const key = createUserKey(request);
  const user = await fetchUser(client, key);
  const token = createToken(request);
  await verifyCredentials(request, user);

  return {
    ...request,
    key,
    user: user as UserSchema,
    token,
  };
} 