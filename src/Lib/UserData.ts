import { AccountSchema, UserSchema } from '../Configuration/Schemas';

export default interface UserData {
  user: UserSchema;
  accounts: AccountSchema[];
}