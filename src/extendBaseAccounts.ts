import { AccountSchema, AccountSubSchema, UserSchema } from './schemas';

export default function extendBaseAccounts(
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
