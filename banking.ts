import { APIGatewayProxyEvent, APIGatewayProxyResult, Handler } from 'aws-lambda';
import * as jwt from 'jsonwebtoken';
import { env } from 'process';
import { TokenPayload, UNAUTHORIZED_ERROR } from './util';

export const accounts: Handler<APIGatewayProxyEvent, APIGatewayProxyResult> = async (event, context) => {
  const bearerHeader = event.headers.Authorization;

  console.log(bearerHeader)

  if (!bearerHeader) {
    return UNAUTHORIZED_ERROR;
  }

  const [bearer, token] = bearerHeader.split(' ');

  if (bearer !== 'Bearer') {
    return UNAUTHORIZED_ERROR;
  }

  try {
    const payload = jwt.verify(token, env.SECRET!) as TokenPayload;
    
    return {
      statusCode: 204,
      body: '',
    }
  } catch (e) {
    return UNAUTHORIZED_ERROR;
  }
}
