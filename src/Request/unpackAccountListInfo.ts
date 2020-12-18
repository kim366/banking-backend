import { APIGatewayProxyEvent } from 'aws-lambda';
import { AccountSubSchema } from '../Configuration/Schemas';
import parseToken from '../Lib/parseToken';
import { listAccountsByUsername } from './DbReadOperations';

export default async function unpackAccountListInfo(event: APIGatewayProxyEvent): Promise<AccountSubSchema[]> {
  const payload = parseToken(event);
  return listAccountsByUsername(payload.username);
}
