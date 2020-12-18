import { APIGatewayProxyResult } from 'aws-lambda';

export default function createStatusCodeResponse(statusCode: number): APIGatewayProxyResult {
    return {
    statusCode,
    body: '',
  };
}
