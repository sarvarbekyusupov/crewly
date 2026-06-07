export enum PaymeError {
  InvalidAmount = -31001,
  TransactionNotFound = -31003,
  CanNotPerformTransaction = -31008,
  CanNotCancelTransaction = -31007,
  InternalError = -32400,
  OrderNotFound = -31050,
}

export enum PaymeState {
  Pending = 1,
  Paid = 2,
  Cancelled = -1,
  CancelledAfterPaid = -2,
}
