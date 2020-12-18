import { APIGatewayProxyEvent, APIGatewayProxyResult, Handler } from 'aws-lambda';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { ACCEPTED, NO_CONTENT, OK } from './Configuration/Definitions';
import deletePendingTransaction from './Mutations/deletePendingTransaction';
import getStringifiedAccounts from './Request/unpackAccountListInfo';
import handleRequest from './Lib/handleResponse';
import performTransaction from './Mutations/performTransaction';
import unpackTransactionInfo from './Request/unpackTransactionInfo';
import unpackTransactionListInfo from './Request/unpackTransactionListInfo';
import savePendingTransaction from './Mutations/savePendingTransaction';
import unpackLoginInfo from './Request/unpackLoginInfo';
import databaseClient from './Configuration/databaseClient';
import { updateLastLoginDate } from './Mutations/updateLastLoginDate';
import stringifyUserData from './Response/createLoginResponse';
import createLoginResponse from './Response/createLoginResponse';
import createStatusCodeResponse from './Response/createStatusCodeResponse';
import createTransactionListResponse from './Response/createTransactionListResponse';
import unpackAccountListInfo from './Request/unpackAccountListInfo';
import createAccountListResponse from './Response/createAccountListResponse';

type LambdaHandler = Handler<APIGatewayProxyEvent, APIGatewayProxyResult>

export const postTransactionHandler: LambdaHandler = event => {
  return handleRequest(async () => {
    const info = await unpackTransactionInfo(event);

    const statusCode = await performTransaction(info);

    return createStatusCodeResponse(statusCode);
  });
};

export const getAccountsHandler: LambdaHandler = event => {
  return handleRequest(async () => {
    const accounts = await unpackAccountListInfo(event);
    
    return createAccountListResponse(accounts);
  });
};

export const getTransactionsHandler: LambdaHandler = event => {
  return handleRequest(async () => {
    const transactions = await unpackTransactionListInfo(event);
    
    return createTransactionListResponse(transactions);
  });
};

export const deleteTransactionHandler: LambdaHandler = event => {
  return handleRequest(async () => {
    const info = await unpackTransactionInfo(event);

    await deletePendingTransaction(info);

    return createStatusCodeResponse(NO_CONTENT);
  });
};

export const putTransactionHandler: LambdaHandler = event => {
  return handleRequest(async () => {
    const info = await unpackTransactionInfo(event);

    const statusCode = await savePendingTransaction(info);
    
    return createStatusCodeResponse(statusCode);
  });
};

export const postLoginHandler: LambdaHandler = event => {
  return handleRequest(async () => {
    const info = await unpackLoginInfo(event);
    
    await updateLastLoginDate(info);

    return createLoginResponse(info);
  });
}
