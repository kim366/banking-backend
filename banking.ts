import { APIGatewayProxyEvent, APIGatewayProxyResult, Handler } from 'aws-lambda';
import * as jwt from 'jsonwebtoken';
import { env } from 'process';
import { TokenPayload, UNAUTHORIZED_ERROR } from './util';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { UserAttributes, UserSchema } from './schemas';

export const accounts: Handler<APIGatewayProxyEvent, APIGatewayProxyResult> = async event => {
  const bearerHeader = event.headers.Authorization;

  console.log(bearerHeader)

  if (!bearerHeader) {
    return UNAUTHORIZED_ERROR;
  }

  const [bearer, token] = bearerHeader.split(' ');

  if (bearer !== 'Bearer') {
    return UNAUTHORIZED_ERROR;
  }

  let payload: TokenPayload;

  try {
    payload = jwt.verify(token, env.SECRET!) as TokenPayload;
  } catch (e) {
    return UNAUTHORIZED_ERROR;
  }

  const userKey: UserAttributes = {
    username: payload.username,
  }

  const user = (await new DocumentClient().get({
    TableName: env.USERS_TABLE!,
    Key: userKey,
    ProjectionExpression:                'accounts'
  }).promise()).Item as Pick<UserSchema, 'accounts'>;
  
  return {
    statusCode: 200,
    body: JSON.stringify(user.accounts),
  }
};
