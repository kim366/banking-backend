import { APIGatewayProxyEvent, APIGatewayProxyResult, Handler } from 'aws-lambda';
import * as crypto from 'crypto';
import { BAD_REQUEST_ERROR, hasStringProperty, TokenPayload, UNAUTHORIZED_ERROR } from './util';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import * as jwt from 'jsonwebtoken';
import { env } from 'process';
import * as faker from 'faker/locale/de_AT';
import { UserAttributes, UserSchema } from './schemas';

interface LoginRequest {
  username: string;
  password: string;
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

  const client = new DocumentClient();

  const user = (await client.get({
    TableName: env.USERS_TABLE!,
    Key: userKey,
    ProjectionExpression: 'DerivedKey, Salt, Iterations, FirstName, LastLogin, LastName'
  }).promise()).Item as Pick<UserSchema, 'DerivedKey' | 'Salt' | 'Iterations' | 'FirstName' | 'LastLogin' | 'LastName'> | undefined;

  if (user) {
    const providedKey = await deriveKey(request.password, user.Salt, user.Iterations);

    if (!user.DerivedKey.equals(providedKey)) {
      return UNAUTHORIZED_ERROR;
    }
  } else  {
    return UNAUTHORIZED_ERROR;
  }

  const now = new Date().toISOString();

  client.update({
    TableName: env.USERS_TABLE!,
    Key: userKey,
    UpdateExpression: 'set LastLogin = :now',
    ExpressionAttributeValues: { ':now': now },
  }).promise();

  const payload: TokenPayload = {
    username: request.username
  };

  const token = jwt.sign(payload, env.SECRET!, { expiresIn: '15 minutes' });

  return {
    statusCode: 200,
    body: JSON.stringify({
      token,
      lastLogin: user.LastLogin ?? now,
      firstName: user.FirstName,
      lastName: user.LastName,
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

    DerivedKey: await deriveKey(event.password, salt, iterations),
    Salt: salt,
    Iterations: iterations,
    
    FirstName: faker.name.firstName(),
    LastName: faker.name.lastName(),
    Accounts: [
      {
        Name: 'Hauptkonto',
        AccountType: 'Girokonto',
        Balance: faker.random.number({ min: -1_000, max: 5_000, precision: 0.01 }),
        Iban: faker.finance.iban(false),
      },
      {
        Name: 'Sparschwein',
        AccountType: 'Sparkonto',
        Balance: faker.random.number({ min: 200, max: 100_000, precision: 0.01 }),
        Iban: faker.finance.iban(false),
      }
    ],
    LastLogin: null,
  }

  await new DocumentClient().put({ TableName: env.USERS_TABLE!, Item: user }).promise();

  return `User ${event.username} successfully created`;
}
