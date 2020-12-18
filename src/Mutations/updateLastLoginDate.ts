import { LoginInfo } from '../Configuration/Types';
import { updateLastLoginDateByUserName } from './DbWriteOperations/index';

export function updateLastLoginDate(
  info: LoginInfo,
): Promise<void> {
  return updateLastLoginDateByUserName(info.user.username, info.newLoginDate);
}
