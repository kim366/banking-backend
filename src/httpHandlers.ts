import { APIGatewayProxyEvent, APIGatewayProxyResult, Handler } from 'aws-lambda';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { ACCEPTED, OK } from './definitions';
import deletePendingTransaction from './deletePendingTransaction';
import getStringifiedAccounts from './getStringifiedAccounts';
import getStringifiedTransactionsWithPagination from './getStringifiedTransactionsWithPagination';
import handleRequest from './handleResponse';
import performTransaction from './performTransaction';
import unpackTransactionInfo from './unpackTransactionInfo';
import unpackTransactionListInfo from './unpackTransactionListInfo';
import savePendingTransaction from './savePendingTransaction';
import unpackLoginInfo from './unpackLoginInfo';
import performLogin from './performLogin';
import databaseClient from './databaseClient';

type LambdaHandler = Handler<APIGatewayProxyEvent, APIGatewayProxyResult>

export const postTransactionHandler: LambdaHandler = event => {
  return handleRequest(async () => {
    const info = await unpackTransactionInfo(databaseClient, event);
    await performTransaction(databaseClient, info);

    return {
      statusCode: OK,
      body: '',
    };
  });
};

export const getAccountsHandler: LambdaHandler = event => {
  return handleRequest(async () => {
    return {
      statusCode: OK,
      body: await getStringifiedAccounts(databaseClient, event),
    }
  });
};

export const getTransactionsHandler: LambdaHandler = event => {
  return handleRequest(async () => {
    const info = await unpackTransactionListInfo(databaseClient, event);
    
    return {
      statusCode: OK,
      body: await getStringifiedTransactionsWithPagination(databaseClient, info),
    }
  });
};

export const deleteTransactionHandler: LambdaHandler = event => {
  return handleRequest(async () => {
    const info = await unpackTransactionInfo(databaseClient, event);
    await deletePendingTransaction(databaseClient, info);

    return {
      statusCode: OK,
      body: '',
    };
  });
};

export const putTransactionHandler: LambdaHandler = event => {
  console.log(event.body);
  return handleRequest(async () => {
    const info = await unpackTransactionInfo(databaseClient, event);

    return {
      statusCode: await savePendingTransaction(databaseClient, info),
      body: '',
    };
  });
};

export const postLoginHandler: LambdaHandler = event => {
  return handleRequest(async () => {
    const info = await unpackLoginInfo(databaseClient, event);
  
    return {
      statusCode: OK,
      body: await performLogin(databaseClient, info),
    };
  });
}
