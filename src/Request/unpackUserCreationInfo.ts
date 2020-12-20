import { APIGatewayProxyEvent } from 'aws-lambda';
import { BAD_REQUEST, MASTER_PASSWORD, UNAUTHORIZED } from '../Configuration/Definitions';
import { EventWithBody, UserCreationRequest } from '../Configuration/Guards';
import ErrorResponse from '../Exceptions/ErrorResponse';  

function parseRequest(event: APIGatewayProxyEvent): UserCreationRequest {
  if (!EventWithBody.guard(event)) {
    throw new ErrorResponse(BAD_REQUEST, 'no body provided');
  }

  const request: unknown = JSON.parse(event.body);

  if (!UserCreationRequest.guard(request)) {
    throw new ErrorResponse(BAD_REQUEST, 'invalid form');
  }

  if (!request.masterPassword || request.masterPassword !== MASTER_PASSWORD) {
    throw new ErrorResponse(UNAUTHORIZED, 'invalid master password');
  }

  return request;
}

export default function unpackUserCreationInfo(event: APIGatewayProxyEvent): UserCreationRequest {
  return parseRequest(event);
}
