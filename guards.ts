import { Literal, Number, Record, Static, String, Union } from 'runtypes';

export const LoginRequest = Record({
  username: String,
  password: String,
});

export type LoginRequest = Static<typeof LoginRequest>;

export const DateString = String.withConstraint(s => !isNaN(new Date(s).getTime()));

export const TransactionTextType = Union(Literal('Verwendungszweck'), Literal('Zahlungsreferenz'), Literal('Senderreferenz'));
export const TransactionType = Union(Literal('Dauerauftrag'), Literal('Eilauftrag'), Literal('Eigenuebertragung'));

export const TransactionRequest = Record({
  timestamp: DateString,
  amount: Number.withConstraint(n => n > 0),
  text: String,
  textType: TransactionTextType,
  type: TransactionType,
  iban: String,
  complementaryIban: String,
  complementaryName: String,
});

export type TransactionRequest = Static<typeof TransactionRequest>;

