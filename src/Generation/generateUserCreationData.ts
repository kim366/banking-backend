import * as faker from 'faker';
import { LoginRequest, UserCreationRequest } from '../Configuration/Guards';
import { AccountSubSchema, UserSchema } from '../Configuration/Schemas';

type PersonalData = Pick<UserSchema, 'firstName' | 'lastName'>;

function generateBaseAccounts(): AccountSubSchema[] {
  return [
    {
      name: 'Hauptkonto',
      accountType: 'Girokonto',
      balance: faker.random.number({ min: -4_000, max: 100_000, precision: 0.01 }),
      iban: faker.finance.iban(false),
      limit: faker.random.number({ min: -7_000, max: 0, precision: 1 }),
    },
    {
      name: 'Sparschwein',
      accountType: 'Sparkonto',
      balance: faker.random.number({ min: 200, max: 100_000, precision: 0.01 }),
      iban: faker.finance.iban(false),
      limit: 0,
    }
  ];
}

function generatePersonalData(): PersonalData {
  return {
    firstName: faker.name.firstName(),
    lastName: faker.name.lastName(),
  }
}

export default function generateUser(request: LoginRequest): UserCreationRequest {
  return {
    ...request,
    ...generatePersonalData(),
    accounts: generateBaseAccounts(),
  };
}
