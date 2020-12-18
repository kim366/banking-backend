import { APIGatewayProxyEvent } from 'aws-lambda';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import * as jwt from 'jsonwebtoken';
import { BAD_REQUEST, SECRET, UNAUTHORIZED, USERS_TABLE } from '../Configuration/Definitions';
import deriveKey from '../Lib/deriveKey';
import ErrorResponse from '../Exceptions/ErrorResponse';
import { EventWithBody, LoginRequest } from '../Configuration/Guards';
import { UserSchema, UserSchemaWithSpecifiedLastLogin } from '../Configuration/Schemas';
import { LoginInfo, TokenPayload } from '../Configuration/Types';
import { fetchUserByUsername } from './DbReadOperations';
import isoNow from '../Lib/isoNow';

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



async function ensurePasswordIsValid(request: LoginRequest, user: UserSchema): Promise<void> {
  const providedKey = await deriveKey(request.password, user.salt, user.iterations);

  if (!user.derivedKey.equals(providedKey)) {
    throw new ErrorResponse (UNAUTHORIZED, 'invalid credentials');
  }
}

async function ensureCredentialsAreValid(request: LoginRequest, user: UserSchema | undefined): Promise<UserSchema> {
  if (!user) {
    throw new ErrorResponse(UNAUTHORIZED, 'invalid credentials')
  }

  await ensurePasswordIsValid(request, user);

  return user;
}

function createToken({ username }: LoginRequest): string {
  const payload: TokenPayload = {
    username,
  };

  return jwt.sign(payload, SECRET);
}

function renewLastLoginDate(
  user: UserSchema,
): { user: UserSchemaWithSpecifiedLastLogin, newLoginDate: string } {
  const newLoginDate = isoNow();

  return {
    user: {
      ...user,
      lastLogin: user.lastLogin ?? newLoginDate,
    },
    newLoginDate,
  }
}

export default async function unpackLoginInfo(event: APIGatewayProxyEvent): Promise<LoginInfo> {
  const request = parseRequest(event);
  const unverifiedUser = await fetchUserByUsername(request.username);
  const token = createToken(request);
  const userWithMaybeUnsetLastLogin = await ensureCredentialsAreValid(request, unverifiedUser);
  const { user, newLoginDate } = renewLastLoginDate(userWithMaybeUnsetLastLogin);

  return {
    ...request,
    user,
    token,
    newLoginDate,
  };
} 