import { APIGatewayProxyEvent } from 'aws-lambda';
import { SECRET, UNAUTHORIZED } from '../Configuration/Definitions';
import ErrorResponse from '../Exceptions/ErrorResponse';
import * as jwt from 'jsonwebtoken';
import { TokenPayload } from '../Configuration/Types';

function getTokenPayload(event: APIGatewayProxyEvent): TokenPayload | null {
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
    return jwt.verify(token, SECRET) as TokenPayload;
  } catch (e) {
    return null;
  }
}

export default function parseToken(event: APIGatewayProxyEvent): TokenPayload {
  const payload = getTokenPayload(event);

  if (!payload) {
    throw new ErrorResponse(UNAUTHORIZED, 'invalid token');
  }

  return payload;
}
