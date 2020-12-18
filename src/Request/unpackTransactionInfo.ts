import { APIGatewayProxyEvent } from 'aws-lambda';
import { BAD_REQUEST, FORBIDDEN, UNAUTHORIZED } from '../Configuration/Definitions';
import { AccountSchema } from '../Configuration/Schemas';
import ErrorResponse from '../Exceptions/ErrorResponse';
import InvolvedParties from '../Lib/InvolvedParties';
import { TokenPayload, TransactionInfo } from '../Configuration/Types';
import parseToken from '../Lib/parseToken';
import { getMultipleAccountsByIban, listAccountsByUsername } from './DbReadOperations';
import { EventWithBody, TransactionRequest } from '../Configuration/Guards';

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

function fetchAccountsInvolvedInTransaction(
  request: TransactionRequest,
): Promise<AccountSchema[] | undefined> {
  return getMultipleAccountsByIban([
    request.iban, request.complementaryIban
  ]);
}

function unpackAccountsInvolvedInTransaction(
  fetchedAccounts: AccountSchema[] | undefined,
  request: TransactionRequest,
  payload: TokenPayload,
): InvolvedParties<AccountSchema> {
  if (!fetchedAccounts) {
    throw new ErrorResponse(BAD_REQUEST, 'an account was not found');
  }

  let accounts: InvolvedParties<AccountSchema> = {
    it: fetchedAccounts.find(a => a.iban === request.iban)!,
    complementary: fetchedAccounts.find(a => a.iban !== request.iban),
  };

  if (accounts.it.username !== payload.username) {
    throw new ErrorResponse(UNAUTHORIZED, 'account not associated with user');
  }

  return accounts;
}

async function ensureUserHasNotExceededLimit(
  { amount }: TransactionRequest,
  account: AccountSchema,
): Promise<void> {
  const userAccounts = await listAccountsByUsername(account.username);

  let { balance, limit } = userAccounts[account.index]
  
  if (limit === undefined) {
    limit = -1000;
  }
  
  if (!balance || balance - amount < limit) {
    throw new ErrorResponse(FORBIDDEN, 'limit exceeded');
  }
}

export default async function unpackTransactionInfo(
  event: APIGatewayProxyEvent,
): Promise<TransactionInfo> {
  const payload = parseToken(event);
  const request = parseRequest(event);
  const fetchedAccounts = await fetchAccountsInvolvedInTransaction(request);
  const accounts = unpackAccountsInvolvedInTransaction(fetchedAccounts, request, payload);

  await ensureUserHasNotExceededLimit(request, accounts.it);

  return {
    // order relevant, otherwise security hole: runtypes does not shave off excess request items
    ...request,
    accounts,
  };
}
