import { APIGatewayProxyResult } from 'aws-lambda';

export default  class ErrorResponse extends Error {
  response: APIGatewayProxyResult;

  constructor(code: number, message: string) {
    super(message);

    this.response = {
      statusCode: code,
      body: JSON.stringify({ error: message }),
    }
  }
};
