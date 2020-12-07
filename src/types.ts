import { LoginRequest, TransactionListRequest, TransactionRequest } from './guards';
import { AccountSchema, UserAttributes, UserSchema } from './schemas';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';

export type UpdateExpression = Pick<DocumentClient.Update, 'UpdateExpression' | 'ExpressionAttributeValues'>;
export type ConditionExpression = Pick<DocumentClient.QueryInput, 'KeyConditionExpression' | 'ExpressionAttributeValues'>;

export interface TokenPayload  {
  username: string
}

export interface InvolvedParties<T> {
  it: T;
  complementary?: T;
}

export interface TransactionInfo extends TransactionRequest {
  accounts: InvolvedParties<AccountSchema>;
}

export interface TransactionListInfo extends TransactionListRequest {
  iban: string;
}

export interface LoginInfo extends LoginRequest {
  key: UserAttributes;
  user: UserSchema;
  token: string;
}
