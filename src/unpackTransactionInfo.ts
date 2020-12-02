import { APIGatewayProxyEvent } from 'aws-lambda';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { env } from 'process';
import { EventWithBody, TransactionRequest } from './guards';
import { AccountAttributes, AccountSchema } from './schemas';
import { ACCOUNTS_TABLE, BAD_REQUEST, UNAUTHORIZED } from './definitions';
import ErrorResponse from './ErrorResponse';
import parseToken from './parseToken';
import { InvolvedParties, TokenPayload, TransactionInfo } from './types';

function parseRequest(event: APIGatewayProxyEvent): TransactionRequest {
  if (!EventWithBody.guard(event)) {
    throw new ErrorResponse(BAD_REQUEST, 'no body provided');
  }
  
  const request: unknown = JSON.parse(event.body);
  
  if (!TransactionRequest.guard(request)) {
    throw new ErrorResponse(BAD_REQUEST, 'invalid form');
  }

  if (request.iban === request.complementaryIban) {
    throw new ErrorResponse(BAD_REQUEST, 'cannot transfer to same account');
  }

  return request;
}

async function fetchAccountsInvolvedInTransaction(
  client: DocumentClient,
  request: TransactionRequest,
): Promise<AccountSchema[] | undefined> {
  const ibanKey: AccountAttributes = {
    iban: request.iban,
  };

  const otherIbanKey: AccountAttributes = {
    iban: request.complementaryIban,
  };

  return (await client.batchGet({
    RequestItems: {
      [env.ACCOUNTS_TABLE!]: {
        Keys: [ibanKey, otherIbanKey],
      }
    }
  }).promise()).Responses?.[ACCOUNTS_TABLE] as AccountSchema[] | undefined;
}

function unpackAccountsInvolvedInTransaction(
  fetchedAccounts: AccountSchema[] | undefined,
  request: TransactionRequest,
  payload: TokenPayload,
): InvolvedParties<AccountSchema> {
  if (!fetchedAccounts || fetchedAccounts.length < 2) {
    throw new ErrorResponse(BAD_REQUEST, 'an account was not found');
  }

  let accounts: InvolvedParties<AccountSchema> = {
    it: fetchedAccounts.find(a => a.iban === request.iban)!,
    complementary: fetchedAccounts.find(a => a.iban !== request.iban)!,
  };

  if (accounts.it.username !== payload.username) {
    throw new ErrorResponse(UNAUTHORIZED, 'account not associated with user');
  }

  return accounts;
}

export default async function unpackTransactionInfo(
  client: DocumentClient,
  event: APIGatewayProxyEvent,
): Promise<TransactionInfo> {
  const payload = parseToken(event);
  const request = parseRequest(event);
  const accounts = await fetchAccountsInvolvedInTransaction(client, request);
  return {
    // order relevant, otherwise security hole: runtypes does not shave off excess request items
    ...request,
    accounts: unpackAccountsInvolvedInTransaction(accounts, request, payload),
  };
}
