import { APIGatewayProxyResult } from 'aws-lambda';

export default  class ErrorResponse {
  response: APIGatewayProxyResult;

  constructor(code: number, message: string) {
    this.response = {
      statusCode: code,
      body: JSON.stringify({ error: message }),
    }
  }
};
