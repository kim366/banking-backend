import { APIGatewayProxyResult } from 'aws-lambda';
import { OK } from '../Configuration/Definitions';
import { TransactionQueryOutput } from '../Configuration/Types';

function createTransactionListBody(transactions: TransactionQueryOutput) {
  return {
    transactions: transactions.Items,
    lastDate: transactions.LastEvaluatedKey?.timestamp,
  }
}

export default function createTransactionListResponse(transactions: TransactionQueryOutput): APIGatewayProxyResult {
  return {
    statusCode: OK,
    body: JSON.stringify(createTransactionListBody(transactions)),
  };
}