import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { env } from 'process';
import * as jwt from 'jsonwebtoken';
import { Record, String } from 'runtypes';

export const BAD_REQUEST_ERROR: APIGatewayProxyResult = withCors({
  statusCode: 400,
  body: ''
});

export const UNAUTHORIZED_ERROR: APIGatewayProxyResult = withCors({
  statusCode: 401,
  body: ''
});

export interface TokenPayload  {
  username: string
}

export function getTokenPayload(event: APIGatewayProxyEvent): TokenPayload | null {
  const bearerHeader = event.headers.Authorization;

  if (!bearerHeader) {
    return null;
  }

  const authorizationWords = bearerHeader.split(' ');

  if (authorizationWords.length !== 2) {
    return null;
  }

  const [bearer, token] = authorizationWords;

  if (bearer !== 'Bearer') {
    return null;
  }

  try {
    return jwt.verify(token, env.SECRET!) as TokenPayload;
  } catch (e) {
    return null;
  }
}

export function withCors(response: APIGatewayProxyResult): APIGatewayProxyResult {
  const headers = response.headers ?? {};
  response.headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    ...headers,
  };

  return response;
}
