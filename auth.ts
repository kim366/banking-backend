import { APIGatewayProxyEvent, APIGatewayProxyResult, Handler } from 'aws-lambda';
import * as crypto from 'crypto';
import { BAD_REQUEST_ERROR, TokenPayload, UNAUTHORIZED_ERROR, withCors } from './util';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import * as jwt from 'jsonwebtoken';
import { env } from 'process';
import * as faker from 'faker/locale/de_AT';
import { AccountSchema, AccountSubSchema, UserAttributes, UserSchema } from './schemas';
import { LoginRequest, EventWithBody } from './guards';


function deriveKey(plaintext: string, salt: Buffer, iterations: number) {
  return new Promise<Buffer>((resolve, reject) =>
    crypto.pbkdf2(plaintext, salt, iterations, 512, 'sha512', (err, derivedKey) =>
      err ? reject(err) : resolve(derivedKey)));
}

export const login: Handler<APIGatewayProxyEvent, APIGatewayProxyResult> = async event => {
  if (!EventWithBody.guard(event)) {
    return BAD_REQUEST_ERROR;
  }

  const request: unknown = JSON.parse(event.body);

  if (!LoginRequest.guard(request)) {
    return BAD_REQUEST_ERROR;
  }

  const userKey: UserAttributes = {
    username: request.username,
  }

  const client = new DocumentClient();

  const user = (await client.get({
    TableName: env.USERS_TABLE!,
    Key: userKey,
  }).promise()).Item as UserSchema | undefined;

  if (user) {
    const providedKey = await deriveKey(request.password, user.salt, user.iterations);

    if (!user.derivedKey.equals(providedKey)) {
      return UNAUTHORIZED_ERROR;
    }
  } else  {
    return UNAUTHORIZED_ERROR;
  }

  const now = new Date().toISOString();

  client.update({
    TableName: env.USERS_TABLE!,
    Key: userKey,
    UpdateExpression: 'set lastLogin = :now',
    ExpressionAttributeValues: { ':now': now },
  }).promise();

  const payload: TokenPayload = {
    username: request.username
  };

  const token = jwt.sign(payload, env.SECRET!, { expiresIn: '15 minutes' });

  return withCors({
    statusCode: 200,
    body: JSON.stringify({
      token,
      lastLogin: user.lastLogin ?? now,
      firstName: user.firstName,
      lastName: user.lastName,
      accounts: user.accounts.map(a => a.iban),
    }),
  });
}

export const create: Handler<LoginRequest, string> = async event => {
  const salt = await new Promise<Buffer>((resolve, reject) =>
    crypto.randomFill(Buffer.allocUnsafe(32), (err, iv) =>
      err ? reject(err) : resolve(iv)));
    
  const iterations = 10000;

  const baseAccounts: AccountSubSchema[] = [
    {
      name: 'Hauptkonto',
      accountType: 'Girokonto',
      balance: faker.random.number({ min: -1_000, max: 5_000, precision: 0.01 }),
      iban: faker.finance.iban(false),
    },
    {
      name: 'Sparschwein',
      accountType: 'Sparkonto',
      balance: faker.random.number({ min: 200, max: 100_000, precision: 0.01 }),
      iban: faker.finance.iban(false),
    }
  ];

  const firstName = faker.name.firstName();
  const lastName = faker.name.lastName();

  const accounts: AccountSchema[] = baseAccounts.map((a, i) => ({ iban: a.iban, username: event.username, firstName, lastName, index: i }));

  const user: UserSchema = {
    username: event.username,

    derivedKey: await deriveKey(event.password, salt, iterations),
    salt: salt,
    iterations: iterations,
    
    firstName,
    lastName,
    accounts: baseAccounts,
    lastLogin: null,
  }

  await new DocumentClient().transactWrite({
    TransactItems: [
      {
        Put: {
          TableName: env.USERS_TABLE!,
          Item: user
        }
      },
      ...accounts.map(a => ({
        Put: {
          TableName: env.ACCOUNTS_TABLE!,
          Item: a,
        }
      }))
    ]
  }).promise();

  return `User ${event.username} successfully created`;
}

export const createMany: Handler<number, string[]> = async n => {
  const result: string[] = [];

  for (let i = 0; i < n; ++i) {
    const user: LoginRequest = {
      username: `AV${faker.random.number({ min: 100000, max: 999999 })}`,
      password: 'passwort123'
    };

    result.push(await create(user, null as any, null as any) as string);
  }

  return result;
}