import { EventBridge, Lambda } from 'aws-sdk';
import { ACCEPTED, FULFIL_TRANSACTION_ARN, FULFIL_TRANSACTION_NAME, NO_CONTENT, TOO_MANY_REQUESTS } from '../Configuration/Definitions';
import ErrorResponse from '../Exceptions/ErrorResponse';
import isoNow from '../Lib/isoNow';
import { TransactionInfo } from '../Configuration/Types';
import { writeTransactionByInfo } from './DbWriteOperations';

const eventBridge = new EventBridge();

function ensureTransactionWasSuccessful(isSuccessful: boolean) {
  if (!isSuccessful) {
    throw new ErrorResponse(TOO_MANY_REQUESTS, 'too many requests');
  }
}

function createScheduleExpression(date: Date) {
  const mins = date.getUTCMinutes();
  const hrs = date.getUTCHours();
  const day = date.getUTCDate();
  const month = date.getUTCMonth() + 1;
  const weekDay = '?';
  const year = date.getUTCFullYear();

  return `cron(${mins} ${hrs} ${day} ${month} ${weekDay} ${year})`;
}

function createId(info: TransactionInfo, prefix: string) {
  return `${prefix}_${info.iban}_${info.timestamp}`.replace(/[^_A-Za-z0-9]/g, '_');
}

async function scheduleFutureTransaction(info: TransactionInfo) {
  const lambda = new Lambda();

  const date = new Date(info.timestamp);
  const eventName = createId(info, 'Transact');
  const permissionName = createId(info, 'Perm');
  const targetName = createId(info, 'Target');

  const ruleArn = (await eventBridge.putRule({
    Name: eventName,
    Description: `Transaction of ${info.amount} from ${info.iban} to ${info.complementaryIban} on ${date.toLocaleString('de')}`,
    ScheduleExpression: createScheduleExpression(date),
  }).promise()).RuleArn;

  await lambda.addPermission({
    Action: 'lambda:InvokeFunction',
    FunctionName: FULFIL_TRANSACTION_NAME,
    Principal: 'events.amazonaws.com',
    SourceArn: ruleArn,
    StatementId: permissionName,
  }).promise();

  await eventBridge.putTargets({
    Rule: eventName,
    Targets: [
      {
        Arn: FULFIL_TRANSACTION_ARN,
        Id: targetName,
        Input: JSON.stringify({
          ...info,
          event: eventName,
          target: targetName,
        }),
      }
    ]
  }).promise();
}

async function deleteEvent({ event, target }: TransactionInfo): Promise<void> {
  if (event && target) {
    await eventBridge.removeTargets({
      Rule: event,
      Ids: [
        target,
      ],
    }).promise();

    await eventBridge.deleteRule({
      Name: event,
    }).promise(); 
  }
}

export default async function performTransaction(
  info: TransactionInfo,
  force = false,
): Promise<number> {
  const now = isoNow();
  const amortizedNow = isoNow(180);

  if (info.timestamp < amortizedNow) {
    const deletionTime = info.timestamp;
    info.timestamp = now;

    await deleteEvent(info);

    const isSuccessful = await writeTransactionByInfo(info, deletionTime);
    ensureTransactionWasSuccessful(isSuccessful);

    return NO_CONTENT;
  } else {
    await scheduleFutureTransaction(info);

    return ACCEPTED;
  }
}
