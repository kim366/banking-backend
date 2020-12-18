import { APIGatewayProxyResult } from 'aws-lambda';
import { OK } from '../Configuration/Definitions';
import { AccountSubSchema } from '../Configuration/Schemas';

function createAccountListBody(accounts: AccountSubSchema[]): { accounts: AccountSubSchema[] } {
  return {
    accounts: accounts.map(account => account.limit === undefined
      ? { ...account, limit: -1000 }
      : account),
  };
}

export default function createAccountListResponse(accounts: AccountSubSchema[]): APIGatewayProxyResult {
  return {
    statusCode: OK,
    body: JSON.stringify(createAccountListBody(accounts)),
  }
} 
