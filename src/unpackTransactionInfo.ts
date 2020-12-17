import { APIGatewayProxyEvent } from 'aws-lambda';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { env } from 'process';
import { EventWithBody, TransactionRequest } from './guards';
import { AccountAttributes, AccountSchema, UserAttributes, UserSchema } from './schemas';
import { ACCOUNTS_TABLE, BAD_REQUEST, FORBIDDEN, UNAUTHORIZED, USERS_TABLE } from './definitions';
import ErrorResponse from './ErrorResponse';
import parseToken from './parseToken';
import { InvolvedParties, TokenPayload, TransactionInfo } from './types';
import UnreachableCodeException from './UnreachableCodeException';

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

  const complementaryIbanKey: AccountAttributes = {
    iban: request.complementaryIban,
  };

  return (await client.batchGet({
    RequestItems: {
      [env.ACCOUNTS_TABLE!]: {
        Keys: [ibanKey, complementaryIbanKey],
      }
    }
  }).promise()).Responses?.[ACCOUNTS_TABLE] as AccountSchema[] | undefined;
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
  client: DocumentClient,
  { amount }: TransactionRequest,
  account: AccountSchema,
): Promise<void> {
  const userKey: UserAttributes = {
    username: account.username,
  };

  const user = (await client.get({
    TableName: USERS_TABLE,
    Key: userKey,
    ProjectionExpression:                'accounts',
  }).promise()).Item as Pick<UserSchema, 'accounts'> | undefined;

  if (!user) {
    throw new UnreachableCodeException(`A corresponding user was not found for account ${account.iban}`);
  }

  let { balance, limit } = user.accounts[account.index]
  
  if (limit === undefined) {
    limit = -1000;
  }
  
  if (!balance || balance - amount < limit) {
    throw new ErrorResponse(FORBIDDEN, 'limit exceeded');
  }
}

export default async function unpackTransactionInfo(
  client: DocumentClient,
  event: APIGatewayProxyEvent,
): Promise<TransactionInfo> {
  const payload = parseToken(event);
  const request = parseRequest(event);
  const fetchedAccounts = await fetchAccountsInvolvedInTransaction(client, request);
  const accounts = unpackAccountsInvolvedInTransaction(fetchedAccounts, request, payload);

  await ensureUserHasNotExceededLimit(client, request, accounts.it);

  return {
    // order relevant, otherwise security hole: runtypes does not shave off excess request items
    ...request,
    accounts,
  };
}
