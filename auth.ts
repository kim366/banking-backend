import { APIGatewayProxyEvent, APIGatewayProxyResult, Handler } from 'aws-lambda';
import * as crypto from 'crypto';
import { BAD_REQUEST_ERROR, hasStringProperty, TokenPayload, UNAUTHORIZED_ERROR } from './util';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import * as jwt from 'jsonwebtoken';
import { env } from 'process';

interface LoginRequest {
  username: string;
  password: string;
}

interface UserAttributes {
  Username: string;
}

interface UserSchema extends UserAttributes {
  Key: Buffer;
  Salt: Buffer;
  Iterations: number;
}

function deriveKey(plaintext: string, salt: Buffer, iterations: number) {
  return new Promise<Buffer>((resolve, reject) =>
    crypto.pbkdf2(plaintext, salt, iterations, 512, 'sha512', (err, derivedKey) =>
      err ? reject(err) : resolve(derivedKey)));
}

export const login: Handler<APIGatewayProxyEvent, APIGatewayProxyResult> = async event => {
  if (!event.body) {
    return BAD_REQUEST_ERROR;
  }

  const request: unknown = JSON.parse(event.body!);
  
  if (!hasStringProperty(request, 'username') || !hasStringProperty(request, 'password')) {
    return BAD_REQUEST_ERROR;
  }

  const userKey: UserAttributes = {
    Username: request.username,
  }

  const user = (await new DocumentClient().get({ TableName: env.USERS_TABLE!, Key: userKey }).promise()).Item as UserSchema | undefined;

  if (user) {
    const providedKey = await deriveKey(request.password, user.Salt, user.Iterations);

    if (!user.Key.equals(providedKey)) {
      return UNAUTHORIZED_ERROR;
    }
  } else  {
    return UNAUTHORIZED_ERROR;
  }

  const payload: TokenPayload = {
    username: request.username
  };

  const token = jwt.sign(payload, env.SECRET!, { expiresIn: '15 minutes' });

  return {
    statusCode: 200,
    body: JSON.stringify({
      token
    })
  };
}

export const create: Handler<LoginRequest, string> = async event => {
  const salt = await new Promise<Buffer>((resolve, reject) =>
    crypto.randomFill(Buffer.allocUnsafe(32), (err, iv) =>
      err ? reject(err) : resolve(iv)));
    
  const iterations = 10000;

  const user: UserSchema = {
    Username: event.username,
    Key: await deriveKey(event.password, salt, iterations),
    Salt: salt,
    Iterations: iterations,
  }

  await new DocumentClient().put({ TableName: env.USERS_TABLE!, Item: user }).promise();

  return `User ${event.username} successfully created`;
}
