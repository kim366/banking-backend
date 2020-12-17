import { Context } from 'aws-lambda';
import { test } from 'uvu';
import * as assert from 'uvu/assert';
import * as nassert from 'assert';
import { createUserHandler } from '../src/privateHandlers';
import axios from 'axios';
import { TransactionListRequest, TransactionRequest } from '../src/guards';
import * as yenv from 'yenv';
import * as defs from '../src/definitions';

const env = yenv('./env.yml');

defs.setUsersTable(env.USERS_TABLE);
defs.setAccountsTable(env.ACCOUNTS_TABLE);
defs.setTransactionsTable(env.TRANSACTIONS_TABLE);
defs.setPendingTransactionsTable(env.PENDING_TRANSACTIONS_TABLE);

const http = axios.create({
  baseURL: 'http://localhost:3000/test/',
});

test.before(async t => {
  try {
    t.users = [
      {
        username: 'AV123456',
        password: 'pass123',
      },
      {
        username: 'AV999999',
        password: 'pass321',
      },
    ];

    t.users = await Promise.all(t.users.map(async ({ username, password }: Record<string, string>) => {
      await createUserHandler({
        username,
        password,
      }, null as unknown as Context, null as unknown as () => string);

      const token = (await http.post('login', {
        username,
        password,
      })).data.token;

      const tokenConfig = {
        headers: {
          'Authorization': 'Bearer ' + token,
        },
      };

      const getAccount = async (i: number) => (await http.get('accounts', tokenConfig)).data.accounts[i];

      return {
        credentials: {
          username,
          password,
        },
        tokenConfig,
        getAccount,
      }
    }));
  } catch (e) {
    if (e.data) {
      console.log(e.data);
    } else {
      console.log(e);
    }
  }
});

test('user should be logged in when passing correct credentials', async t => {
  const getResponse = () =>  http.post('login', t.users[0].credentials);

  await nassert.doesNotReject(getResponse);
});

test('user should be rejected when passing incorrect credentials', async t => {
  const getResponse = () => http.post('login', {
    username: 'incorrectUsername',
    password: 'incorrectPassword',
  });

  await nassert.rejects(getResponse);
});

test('user should receive the default two accounts with auth token', async t => {
  const response = await http.get('accounts', t.users[0].tokenConfig);

  assert.is(response.data.accounts.length, 2);
});

test('user should be rejected without auth token', async t => {
  const getResponse = () => http.get('accounts');

  await nassert.rejects(getResponse);
});

test('money should be deducted from account on transfer', async t => {
  const { balance, iban } = await t.users[0].getAccount(0);

  const req: TransactionRequest = {
    amount: 10,
    iban,
    complementaryIban: 'someiban123',
    complementaryName: 'Hans Z.',
    text: 'Money for you',
    textType: 'Verwendungszweck',
    timestamp: new Date().toISOString(),
    type: '',
  }

  await http.post('transaction', req, t.users[0].tokenConfig);

  const newBalance = (await t.users[0].getAccount(0)).balance;

  assert.ok(Math.abs(newBalance - (balance - 10)) < 0.01, `expected ${newBalance} to be almost ${balance}`);
});

test('money should be credited to other account on transfer', async t => {
  const iban = (await t.users[0].getAccount(0)).iban;
  const { balance, iban: otherIban } = await t.users[1].getAccount(0);

  const req: TransactionRequest = {
    amount: 10,
    iban,
    complementaryIban: otherIban,
    complementaryName: 'Hans Z.',
    text: 'Money for you',
    textType: 'Verwendungszweck',
    timestamp: new Date().toISOString(),
    type: '',
  }

  await http.post('transaction', req, t.users[0].tokenConfig);

  const newBalance = (await t.users[1].getAccount(0)).balance;

  assert.ok(Math.abs(newBalance - (balance + 10)) < 0.01, `expected ${newBalance} to be almost ${balance}`);
});

test('a transaction entry should be created on trasfer', async t => {
  const iban = (await t.users[0].getAccount(0)).iban;

  const listReq: TransactionListRequest = {
    n: 10,
  };

  const length = (await http.post(`transactions/${iban}`, listReq, t.users[0].tokenConfig)).data.transactions.length;

  const req: TransactionRequest = {
    amount: 10,
    iban,
    complementaryIban: 'someiban123',
    complementaryName: 'Hans Z.',
    text: 'Money for you',
    textType: 'Verwendungszweck',
    timestamp: new Date().toISOString(),
    type: '',
  }

  await http.post('transaction', req, t.users[0].tokenConfig);

  const newLength = (await http.post(`transactions/${iban}`, listReq, t.users[0].tokenConfig)).data.transactions.length;

  assert.is(newLength, length + 1);
});

test('a transaction saved for later should show up as an entry', async t => {
  const iban = (await t.users[0].getAccount(0)).iban;

  const listReq: TransactionListRequest = {
    n: 10,
    stored: true,
  };

  const length = (await http.post(`transactions/${iban}`, listReq, t.users[0].tokenConfig)).data.transactions.length;

  const req: TransactionRequest = {
    amount: 10,
    iban,
    complementaryIban: 'someiban123',
    complementaryName: 'Hans Z.',
    text: 'Money for you',
    textType: 'Verwendungszweck',
    timestamp: new Date().toISOString(),
    type: '',
  }

  await http.put('transaction', req, t.users[0].tokenConfig);

  const newLength = (await http.post(`transactions/${iban}`, listReq, t.users[0].tokenConfig)).data.transactions.length;

  assert.is(newLength, length + 1);
});


test('a transaction saved for later and deleted should not show up as an entry', async t => {
  const iban = (await t.users[0].getAccount(0)).iban;

  const listReq: TransactionListRequest = {
    n: 10,
    stored: true,
  };

  const length = (await http.post(`transactions/${iban}`, listReq, t.users[0].tokenConfig)).data.transactions.length;

  const req: TransactionRequest = {
    amount: 10,
    iban,
    complementaryIban: 'someiban123',
    complementaryName: 'Hans Z.',
    text: 'Money for you',
    textType: 'Verwendungszweck',
    timestamp: new Date().toISOString(),
    type: '',
  }

  await http.put('transaction', req, t.users[0].tokenConfig);
  await http.request({
    method: 'DELETE',
    data: req,
    url: 'transaction',
    ...t.users[0].tokenConfig,
  });

  const newLength = (await http.post(`transactions/${iban}`, listReq, t.users[0].tokenConfig)).data.transactions.length;

  assert.is(newLength, length);
});

test('user should be forbidden from transferring an amount exceeding account limit', async t => {
  const { balance, iban } = await t.users[0].getAccount(0);

  const req: TransactionRequest = {
    amount: 8_000, // default limit is -1_000; maximum given default balance is 5_000
    iban,
    complementaryIban: 'someiban123',
    complementaryName: 'Hans Z.',
    text: 'Money for you',
    textType: 'Verwendungszweck',
    timestamp: new Date().toISOString(),
    type: '',
  }

  return http.post('transaction', req, t.users[0].tokenConfig)
    .then(() => {
      throw new Error('user has not been rejected from exceeding their limit');
    })
    .catch(e => {
      if (e.response) {
        assert.is(e.response.status, 403);
      }
    });
});

test.run();
