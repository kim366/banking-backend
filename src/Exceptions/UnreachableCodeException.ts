export default class UnreachableCodeException extends Error {
  constructor(public message: string) {
    super(message);
  }

}