import { LoginRequest, TransactionListRequest, TransactionRequest } from './Guards';
import { AccountSchema, TransactionSchema, UserSchemaWithSpecifiedLastLogin } from './Schemas';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import InvolvedParties from '../Lib/InvolvedParties';
import { TransactionAttributes } from './Attributes';

export type UpdateExpression = Pick<DocumentClient.Update, 'UpdateExpression' | 'ExpressionAttributeValues'>;
export type ConditionExpression = Pick<DocumentClient.QueryInput, 'KeyConditionExpression' | 'ExpressionAttributeValues'>;

export interface TokenPayload  {
  username: string
}

export interface TransactionQueryOutput extends DocumentClient.QueryOutput {
  Items?: TransactionSchema[];
  LastEvaluatedKey?: TransactionAttributes;
};

export interface TransactionInfo extends TransactionRequest {
  accounts: InvolvedParties<AccountSchema>;
  // EventBridge IDs
  event?: string;
  target?: string;
}

export interface TransactionListInfo extends TransactionListRequest {
  iban: string;
}

export interface LoginInfo extends LoginRequest {
  user: UserSchemaWithSpecifiedLastLogin;
  token: string;
  newLoginDate: string;
}
