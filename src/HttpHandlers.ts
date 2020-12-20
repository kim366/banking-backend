import { APIGatewayProxyEvent, APIGatewayProxyResult, Handler } from 'aws-lambda';
import { NO_CONTENT } from './Configuration/Definitions';
import deriveFullUser from './Generation/deriveFullUser';
import handleRequest from './Lib/handleResponse';
import createUser from './Mutations/createUser';
import deletePendingTransaction from './Mutations/deletePendingTransaction';
import performTransaction from './Mutations/performTransaction';
import savePendingTransaction from './Mutations/savePendingTransaction';
import { updateLastLoginDate } from './Mutations/updateLastLoginDate';
import unpackAccountListInfo from './Request/unpackAccountListInfo';
import unpackLoginInfo from './Request/unpackLoginInfo';
import unpackTransactionInfo from './Request/unpackTransactionInfo';
import unpackTransactionListInfo from './Request/unpackTransactionListInfo';
import unpackUserCreationInfo from './Request/unpackUserCreationInfo';
import createAccountListResponse from './Response/createAccountListResponse';
import createLoginResponse from './Response/createLoginResponse';
import createStatusCodeResponse from './Response/createStatusCodeResponse';
import createTransactionListResponse from './Response/createTransactionListResponse';

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

export const postCreateUserHandler: LambdaHandler = event => {
  return handleRequest(async () => {
    const bareUser = unpackUserCreationInfo(event);
    const userData = await deriveFullUser(bareUser);

    await createUser(userData);
    
    return createStatusCodeResponse(NO_CONTENT);
  });
}
