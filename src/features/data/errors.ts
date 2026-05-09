import type { ActionableError } from '../../types'

export class DataImportError extends Error {
  readonly detail: ActionableError

  constructor(detail: ActionableError) {
    super(`${detail.what} ${detail.why} ${detail.nextStep}`)
    this.name = 'DataImportError'
    this.detail = detail
  }
}

export function actionableError(reason: unknown): ActionableError {
  if (reason instanceof DataImportError) {
    return reason.detail
  }

  if (reason instanceof Error) {
    return {
      code: 'unexpected_error',
      recoverable: true,
      what: 'The data operation failed.',
      why: reason.message,
      nextStep: 'Check the dataset format or try a smaller excerpt.',
    }
  }

  return {
    code: 'unexpected_error',
    recoverable: true,
    what: 'The data operation failed.',
    why: 'The app received an unknown failure.',
    nextStep: 'Try the operation again or reload the page.',
  }
}
