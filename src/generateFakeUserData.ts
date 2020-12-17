import * as crypto from 'crypto';
import * as faker from 'faker';
import deriveKey from './deriveKey';
import { LoginRequest } from './guards';
import { AccountSubSchema, UserSchema } from './schemas';

type PersonalData = Pick<UserSchema, 'firstName' | 'lastName'>;
type CryptographicData = Pick<UserSchema, 'derivedKey' | 'salt' | 'iterations'>;

function generateBaseAccounts(): AccountSubSchema[] {
  return [
    {
      name: 'Hauptkonto',
      accountType: 'Girokonto',
      balance: faker.random.number({ min: -1_000, max: 5_000, precision: 0.01 }),
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

async function generateCryptographicData({ password }: LoginRequest): Promise<CryptographicData> {
  const salt = await new Promise<Buffer>((resolve, reject) =>
  crypto.randomFill(Buffer.allocUnsafe(32), (err, iv) =>
    err ? reject(err) : resolve(iv)));
  
  const iterations = 10000;

  const derivedKey = await deriveKey(password, salt, iterations);

  return { salt, iterations, derivedKey };
}

function generatePersonalData(): PersonalData {
  return {
    firstName: faker.name.firstName(),
    lastName: faker.name.lastName(),
  }
}

export default async function generateFakeUserInfo(request: LoginRequest): Promise<UserSchema> {
  return {
    username: request.username,
    ...generatePersonalData(),
    ...await generateCryptographicData(request),
    accounts: generateBaseAccounts(),
    lastLogin: null,
  };
}
