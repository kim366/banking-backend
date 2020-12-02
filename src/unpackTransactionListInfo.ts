import { APIGatewayProxyEvent } from 'aws-lambda';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { EventWithBody, TransactionListRequest } from './guards';
import { AccountAttributes, AccountSchema } from './schemas';
import { ACCOUNTS_TABLE, BAD_REQUEST, UNAUTHORIZED } from './definitions';
import ErrorResponse from './ErrorResponse';
import parseToken from './parseToken';
import { TokenPayload, TransactionListInfo } from './types';

function parseRequest(event: APIGatewayProxyEvent): TransactionListRequest {
  if (!EventWithBody.guard(event)) {
    throw new ErrorResponse(BAD_REQUEST, 'no body provided');
  }

  const request: unknown = JSON.parse(event.body);

  if (!TransactionListRequest.guard(request)) {
    throw new ErrorResponse(BAD_REQUEST, 'invalid form');
  }

  return request;
}

function associateRequestWithPathParameters(event: APIGatewayProxyEvent, request: TransactionListRequest): TransactionListInfo {
  return {
    ...request,
    iban: event.pathParameters!.iban,
  }
}

function createAccountKey({ iban }: TransactionListInfo): AccountAttributes {
  return {
    iban,
  }
}

function verifyAccountOwnership(
  fetchedAccount: AccountSchema | undefined,
  payload: TokenPayload
): void {
  if (!fetchedAccount || fetchedAccount.username !== payload.username) {
    throw new ErrorResponse(UNAUTHORIZED, 'account not associated with user');
  }
}

async function fetchAccount(client: DocumentClient, key: AccountAttributes): Promise<AccountSchema | undefined> {
  return (await client.get({
    TableName: ACCOUNTS_TABLE,
    Key: key
  }).promise()).Item as AccountSchema | undefined;
}

export default async function unpackTransactionListInfo(client: DocumentClient, event: APIGatewayProxyEvent): Promise<TransactionListInfo> {
  const payload = parseToken(event);
  const request = parseRequest(event);
  const info = associateRequestWithPathParameters(event, request);
  const key = createAccountKey(info);
  const account = await fetchAccount(client, key);
  verifyAccountOwnership(account, payload);

  return info;
}
