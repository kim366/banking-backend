import * as faker from 'faker';

export default function generateLoginData() {
  return {
    username: `AV${faker.random.number({ min: 100000, max: 999999 })}`,
    password: 'passwort123',
  };
}