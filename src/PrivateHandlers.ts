import { Handler } from 'aws-lambda';
import generateLoginData from './Generation/generateLoginData';
import generateUserData from './Generation/generateUserCreationData';
import { TransactionInfo } from './Configuration/Types';
import createUser from './Mutations/createUser';
import performTransaction from './Mutations/performTransaction';
import stringifyUserGeneration from './Response/createUserGenerationResponse';
import { LoginRequest } from './Configuration/Guards';
import deriveFullUser from './Generation/deriveFullUser';

export const createUserHandler: Handler<LoginRequest, string> = async loginData => {
  const bareUser = generateUserData(loginData);
  const userData = await deriveFullUser(bareUser);

  await createUser(userData);

  return stringifyUserGeneration(userData);
}

export const createManyUsersHandler: Handler<number, string[]> = async n => {
  const responses = [];
  
  for (let i = 0; i < n; ++i) {
    const loginData = generateLoginData();
    const bareUser = generateUserData(loginData);
    const userData = await deriveFullUser(bareUser);
  
    await createUser(userData);
  
    responses.push(stringifyUserGeneration(userData));
  }

  return responses;
}

export const fulfilTransactionHandler: Handler<TransactionInfo, void> = async info => {
  await performTransaction(info);
};
