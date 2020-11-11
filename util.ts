import { APIGatewayProxyResult } from 'aws-lambda';

export function isObject(obj: unknown): obj is object {
  return typeof obj === 'object' && obj !== null;
}

export function hasOwnProperty<X extends {}, Y extends PropertyKey>(obj: unknown, prop: Y): obj is X & Record<Y, unknown> {
  return isObject(obj) && Object.hasOwnProperty.call(obj, prop)
}

export function hasStringProperty<X extends {}, Y extends PropertyKey>(obj: unknown, prop: Y): obj is X & Record<Y, string> {
  return hasOwnProperty(obj, prop) && typeof obj[prop] === 'string';
}

export const BAD_REQUEST_ERROR: APIGatewayProxyResult = {
  statusCode: 400,
  body: ''
}

export const UNAUTHORIZED_ERROR: APIGatewayProxyResult = {
  statusCode: 401,
  body: ''
}

export interface TokenPayload  {
  username: string
}

export function withCors(response: APIGatewayProxyResult): APIGatewayProxyResult {
  const headers = response.headers ?? {};
  response.headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    ...headers,
  }

  return response;
}
