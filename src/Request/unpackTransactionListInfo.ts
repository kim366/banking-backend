import { APIGatewayProxyEvent } from 'aws-lambda';
import { BAD_REQUEST, UNAUTHORIZED } from '../Configuration/Definitions';
import { AccountSchema } from '../Configuration/Schemas';
import ErrorResponse from '../Exceptions/ErrorResponse';
import { TokenPayload, TransactionListInfo, TransactionQueryOutput } from '../Configuration/Types';
import parseToken from '../Lib/parseToken';
import { EventWithBody, TransactionListRequest } from '../Configuration/Guards';
import { getAccountByIban, listTransactions } from './DbReadOperations';

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

function ensureAccountIsOwnedByRequestor(
  fetchedAccount: AccountSchema | undefined,
  payload: TokenPayload
): void {
  if (!fetchedAccount || fetchedAccount.username !== payload.username) {
    throw new ErrorResponse(UNAUTHORIZED, 'account not associated with user');
  }
}

export default async function unpackTransactionListInfo(event: APIGatewayProxyEvent): Promise<TransactionQueryOutput> {
  const payload = parseToken(event);
  const request = parseRequest(event);
  const info = associateRequestWithPathParameters(event, request);
  const account = await getAccountByIban(info.iban);
  ensureAccountIsOwnedByRequestor(account, payload);

  return listTransactions(info);
}
