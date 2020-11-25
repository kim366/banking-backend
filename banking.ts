import { APIGatewayProxyEvent, APIGatewayProxyResult, Handler } from 'aws-lambda';
import { env } from 'process';
import { createBadRequestError, getTokenPayload, createUnauthorizedError, withCors } from './util';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { AccountAttributes, AccountSchema, TransactionAttributes, TransactionSchema, UserAttributes, UserSchema } from './schemas';
import { TransactionRequest, EventWithBody, TransactionListRequest } from './guards';

export const accounts: Handler<APIGatewayProxyEvent, APIGatewayProxyResult> = async event => {
  const payload = getTokenPayload(event);

  if (!payload) {
    return createUnauthorizedError('invalid token');
  }

  const userKey: UserAttributes = {
    username: payload.username,
  }

  const user = (await new DocumentClient().get({
    TableName: env.USERS_TABLE!,
    Key: userKey,
    ProjectionExpression:                'accounts'
  }).promise()).Item as Pick<UserSchema, 'accounts'>;
  
  return withCors({
    statusCode: 200,
    body: JSON.stringify({
      accounts: user.accounts,
    }),
  });
};

async function verifyTransaction(event: APIGatewayProxyEvent, client: DocumentClient) {
  const payload = getTokenPayload(event);
  
  if (!payload) {
    return createUnauthorizedError('invalid token');
  }

  if (!EventWithBody.guard(event)) {
    return createBadRequestError('no body provided');
  }
  
  const request: unknown = JSON.parse(event.body);
  
  if (!TransactionRequest.guard(request)) {
    return createBadRequestError('invalid form');
  }

  if (request.iban === request.complementaryIban) {
    return createBadRequestError('cannot transfer to same account');
  }

  const ibanKey: AccountAttributes = {
    iban: request.iban,
  }
  const otherIbanKey: AccountAttributes = {
    iban: request.complementaryIban,
  }

  const fetchedAccounts = (await client.batchGet({
    RequestItems: {
      [env.ACCOUNTS_TABLE!]: {
        Keys: [ibanKey, otherIbanKey],
      }
    }
  }).promise()).Responses?.[env.ACCOUNTS_TABLE!] as AccountSchema[] | undefined;

  if (!fetchedAccounts || fetchedAccounts.length < 2) {
    return createBadRequestError('an account was not found');
  }

  let [account, complementaryAccount] = fetchedAccounts;
  if (account.iban !== request.iban) {
    [complementaryAccount, account] = fetchedAccounts;
  }

  if (account.username !== payload.username) {
    return createUnauthorizedError('account not associated with user');
  }

  return { account, complementaryAccount, request, payload };
}

function isError(verification: unknown): verification is APIGatewayProxyResult {
  return Object.hasOwnProperty.call(verification, 'statusCode');
}

export const performTransaction: Handler<APIGatewayProxyEvent, APIGatewayProxyResult> = async event => {
  const client = new DocumentClient();
  const verification = await verifyTransaction(event, client);

  if (isError(verification)) {
    return verification;
  }

  const { account, complementaryAccount, request, payload } = verification;

  const transactionKey: TransactionAttributes = {
    iban: request.iban,
    timestamp: request.timestamp,
  };

  const transaction: TransactionSchema = {
    ...transactionKey,
    amount: -request.amount,
    complementaryIban: request.complementaryIban,
    complementaryName: request.complementaryName,
    text: request.text,
    textType: request.textType,
    type: request.type,
  };

  const complementaryTransaction: TransactionSchema = {
    ...transaction,
    amount: request.amount,
    iban: request.complementaryIban,
    complementaryIban: request.iban,
    complementaryName: `${account.firstName} ${account.lastName}`,
  };

  const userKey: UserAttributes = {
    username: payload.username,
  };

  const complementaryUserKey: UserAttributes = {
    username: complementaryAccount.username,
  };

  await client.transactWrite({
    TransactItems: [
      {
        Put: {
          TableName: env.TRANSACTIONS_TABLE!,
          Item: transaction,
        }
      },
      {
        Put: {
          TableName: env.TRANSACTIONS_TABLE!,
          Item: complementaryTransaction
        }
      },
      {
        Update: {
          TableName: env.USERS_TABLE!,
          Key: userKey,
          UpdateExpression: `add accounts[${account.index}].balance :amount`,
          ExpressionAttributeValues: {
            ':amount': -request.amount,
          }
        }
      },
      {
        Update: {
          TableName: env.USERS_TABLE!,
          Key: complementaryUserKey,
          UpdateExpression: `add accounts[${complementaryAccount.index}].balance :amount`,
          ExpressionAttributeValues: {
            ':amount': request.amount,
          }
        }
      },
      {
        Delete: {
          Key: transactionKey,
          TableName: env.PENDING_TRANSACTIONS_TABLE!,
        }
      }
    ]
  }).promise();

  return withCors({
    statusCode: 204,
    body: '',
  });
}

export const listTransactions: Handler<APIGatewayProxyEvent, APIGatewayProxyResult> = async event => {
  const iban = event.pathParameters!.iban;

  const payload = getTokenPayload(event);
  
  if (!payload) {
    return createUnauthorizedError('invalid token');
  }

  if (!EventWithBody.guard(event)) {
    return createBadRequestError('no body provided');
  }

  const request: unknown = JSON.parse(event.body);

  if (!TransactionListRequest.guard(request)) {
    return createBadRequestError('invalid form');
  }

  const client = new DocumentClient();

  const ibanKey: AccountAttributes = {
    iban,
  }

  const fetchedAccount = (await client.get({
    TableName: env.ACCOUNTS_TABLE!,
    Key: ibanKey
  }).promise()).Item as AccountSchema | undefined;

  if (!fetchedAccount || fetchedAccount.username !== payload.username) {
    return createUnauthorizedError('account not associated with user');
  }

  interface TransactionQueryOutput extends DocumentClient.QueryOutput {
    Items?: TransactionSchema[];
    LastEvaluatedKey?: TransactionAttributes;
  }

  const transactionParams: DocumentClient.QueryInput = {
    TableName: env.TRANSACTIONS_TABLE!,
    KeyConditionExpression: 'iban = :iban',
    Limit: request.n,
    ExpressionAttributeValues: {
      ':iban': iban,
    }
  };

  if (request.exclusiveDate) {
    const exclusiveStartKey: TransactionAttributes = {
      iban: iban,
      timestamp: request.exclusiveDate,
    };

    transactionParams.ExclusiveStartKey = exclusiveStartKey;
  }

  const transactions = (await client.query(transactionParams).promise()) as TransactionQueryOutput;

  return withCors({
    statusCode: 200,
    body: JSON.stringify({
      transactions: transactions.Items,
      lastDate: transactions.LastEvaluatedKey?.timestamp,
    }),
  });
}

export const deleteTransaction: Handler<APIGatewayProxyEvent, APIGatewayProxyResult> = async event => {
  const client = new DocumentClient();
  const verification = await verifyTransaction(event, client);

  if (isError(verification)) {
    return verification;
  }

  const { request } = verification;

  const transactionKey: TransactionAttributes =  {
    iban: request.iban,
    timestamp: request.timestamp,
  };

  client.delete({
    Key: transactionKey,
    TableName: env.PENDING_TRANSACTIONS_TABLE!,

  }).promise();

  return {
    statusCode: 202,
    body: '',
  };
};

export const saveTransaction: Handler<APIGatewayProxyEvent, APIGatewayProxyResult> = async event => {
  const client = new DocumentClient();
  const verification = await verifyTransaction(event, client);

  if (isError(verification)) {
    return verification;
  }

  const { request } = verification;
  
  const transaction: TransactionSchema = {
    iban: request.iban,
    timestamp: request.timestamp,
    amount: request.amount,
    complementaryIban: request.complementaryIban,
    complementaryName: request.complementaryName,
    text: request.text,
    textType: request.textType,
    type: request.type,
  };

  const savedTransaction = await client.put({
    Item: transaction,
    TableName: env.PENDING_TRANSACTIONS_TABLE!,
    ReturnValues: 'ALL_OLD',
  }).promise();

  return {
    statusCode: savedTransaction.Attributes ? 204 : 201,
    body: '',
  };
};
