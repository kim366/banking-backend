export const OK = 200;
export const CREATED = 201;
export const ACCEPTED = 202;
export const NO_CONTENT = 204;
export const BAD_REQUEST = 400;
export const UNAUTHORIZED = 401;
export const TOO_MANY_REQUESTS = 429;

export const STAGE = process.env.STAGE!;
export const SECRET = process.env.SECRET!

export let USERS_TABLE = process.env.USERS_TABLE!;
export let ACCOUNTS_TABLE = process.env.ACCOUNTS_TABLE!;
export let TRANSACTIONS_TABLE = process.env.TRANSACTIONS_TABLE!;
export let PENDING_TRANSACTIONS_TABLE = process.env.PENDING_TRANSACTIONS_TABLE!;

export const setUsersTable = (x: string) => USERS_TABLE = x;
export const setAccountsTable = (x: string) => ACCOUNTS_TABLE = x;
export const setTransactionsTable = (x: string) => TRANSACTIONS_TABLE = x;
export const setPendingTransactionsTable = (x: string) => PENDING_TRANSACTIONS_TABLE = x;
