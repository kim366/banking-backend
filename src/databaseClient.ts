import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { STAGE } from './definitions';

let dbConfig = undefined;

if (!STAGE || STAGE === 'test') {
  dbConfig = {
    region: 'localhost',
    endpoint: 'http://localhost:8000',
  };
}

export default new DocumentClient(dbConfig);