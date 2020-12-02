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

type LambdaHandler = Handler<APIGatewayProxyEvent, APIGatewayProxyResult>

const client = new DocumentClient();

export const postTransactionHandler: LambdaHandler = event => {
  return handleRequest(async () => {
    const info = await unpackTransactionInfo(client, event);
    performTransaction(client, info);

    return {
      statusCode: ACCEPTED,
      body: '',
    };
  });
};

export const getAccountsHandler: LambdaHandler = event => {
  return handleRequest(async () => {
    return {
      statusCode: OK,
      body: await getStringifiedAccounts(client, event),
    }
  });
};

export const getTransactionsHandler: LambdaHandler = event => {
  return handleRequest(async () => {
    const info = await unpackTransactionListInfo(client, event);
    
    return {
      statusCode: OK,
      body: await getStringifiedTransactionsWithPagination(client, info),
    }
  });
};

export const deleteTransactionHandler: LambdaHandler = event => {
  return handleRequest(async () => {
    const info = await unpackTransactionInfo(client, event);
    deletePendingTransaction(client, info);

    return {
      statusCode: ACCEPTED,
      body: '',
    };
  });
};

export const putTransactionHandler: LambdaHandler = event => {
  return handleRequest(async () => {
    const info = await unpackTransactionInfo(client, event);

    return {
      statusCode: await savePendingTransaction(client, info),
      body: '',
    };
  });
};

export const postLoginHandler: LambdaHandler = event => {
  return handleRequest(async () => {
    const info = await unpackLoginInfo(client, event);
  
    return {
      statusCode: OK,
      body: await performLogin(client, info),
    };
  });
}
