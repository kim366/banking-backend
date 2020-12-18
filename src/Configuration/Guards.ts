import { Literal, Number, Partial, Record, Static, String, Union, Boolean } from 'runtypes';

export const LoginRequest = Record({
  username: String,
  password: String,
});

export type LoginRequest = Static<typeof LoginRequest>;

export const DateString = String.withConstraint(s => !isNaN(new Date(s).getTime()));

export const TransactionTextType = Union(Literal('Verwendungszweck'), Literal('Zahlungsreferenz'));
export const TransactionType = Union(Literal('Dauerauftrag'), Literal('Eilauftrag'), Literal('Eigenuebertragung'), Literal(''));

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

export const EventWithBody = Record({
  body: String,
});

export const TransactionListRequest = Record({
  n: Number,
}).And(Partial({
  type: TransactionType,
  exclusiveDate: DateString,
  stored: Boolean,
}));

export type TransactionListRequest = Static<typeof TransactionListRequest>;
