import { TransactionInfo } from '../Configuration/Types';
import { deletePendingTransactionByInfo } from './DbWriteOperations';

export default function deletePendingTransaction(info: TransactionInfo): Promise<void> {
  return deletePendingTransactionByInfo(info);
}
