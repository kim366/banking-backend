import { APIGatewayProxyResult } from 'aws-lambda';
import ErrorResponse from './ErrorResponse';

export function withCors(response: APIGatewayProxyResult): APIGatewayProxyResult {
  const headers = response.headers ?? {};
  response.headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    ...headers,
  };

  return response;
}

export default async function handleRequest(
  work: () => APIGatewayProxyResult | Promise<APIGatewayProxyResult>
): Promise<APIGatewayProxyResult> {
  try {
    return withCors(await work());
  } catch (e) {
    if (e instanceof ErrorResponse) {
      return withCors(e.response);
    }
    throw e;
  }
}
