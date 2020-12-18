import UserData from '../Lib/UserData';

export default function createUserGenerationResponse({ user: { username } }: UserData) {
  return `User ${username} successfully created`;
}