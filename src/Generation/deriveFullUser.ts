import { LoginRequest, UserCreationRequest } from '../Configuration/Guards';
import { AccountSchema, UserSchema } from '../Configuration/Schemas';
import deriveKey from '../Lib/deriveKey';
import * as crypto from 'crypto';
import UserData from '../Lib/UserData';

type CryptographicData = Pick<UserSchema, 'derivedKey' | 'salt' | 'iterations'>;

function deriveAccounts(
  { firstName, lastName, username, accounts: baseAccounts }: UserSchema,
): AccountSchema[] {
  return baseAccounts.map((a, i) => ({
    username,
    firstName,
    lastName,
    iban: a.iban,
    index: i,
  }));
}

async function generateCryptographicData({ password }: LoginRequest): Promise<CryptographicData> {
  const salt = await new Promise<Buffer>((resolve, reject) =>
  crypto.randomFill(Buffer.allocUnsafe(32), (err, iv) =>
    err ? reject(err) : resolve(iv)));
  
  const iterations = 10000;

  const derivedKey = await deriveKey(password, salt, iterations);

  return { salt, iterations, derivedKey };
}

export default async function deriveFullUser(user: UserCreationRequest): Promise<UserData> {
  const fullUser: UserSchema = {
    ...user,
    ...await generateCryptographicData(user),
    lastLogin: null,
  };

  delete (fullUser as any).password;

  return {
    user: fullUser,
    accounts: deriveAccounts(fullUser),
  };
}
