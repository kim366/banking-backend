import { Handler } from 'aws-lambda';
import { LoginRequest } from './guards';
import createUser from './createUser';
import extendBaseAccounts from './extendBaseAccounts';
import generateFakeUserInfo from './generateFakeUserData';
import * as faker from 'faker';
import databaseClient from './databaseClient';
import performTransaction from './performTransaction';
import { TransactionInfo } from './types';

async function create(user: LoginRequest) {
  const info = await generateFakeUserInfo(user);
  const accounts = extendBaseAccounts(info);

  await createUser(databaseClient, info, accounts);

  return `User ${info.username} successfully created`;
}

export const createUserHandler: Handler<LoginRequest, string> = request => {
  return create(request);
}

export const createManyUsersHandler: Handler<number, string[]> = n => {
  return Promise.all(Array(n).map(async () => {
    const user: LoginRequest = {
      username: `AV${faker.random.number({ min: 100000, max: 999999 })}`,
      password: 'passwort123',
    };

    return create(user);
  }));
}

export const fulfilTransactionHandler: Handler<TransactionInfo, void> = async info => {
  await performTransaction(databaseClient, info);
};
