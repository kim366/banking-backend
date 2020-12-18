import { APIGatewayProxyResult } from 'aws-lambda';
import { OK } from '../Configuration/Definitions';
import { LoginInfo } from '../Configuration/Types';

function createUserDataBody({ user, token }: LoginInfo) {
  return {
    token,
    lastLogin: user.lastLogin,
    firstName: user.firstName,
    lastName: user.lastName,
    accounts: user.accounts.map(a => a.iban),
  };
}

export default function createLoginResponse(info: LoginInfo): APIGatewayProxyResult {
  return {
    statusCode: OK,
    body: JSON.stringify(createUserDataBody(info)),
  };
}
