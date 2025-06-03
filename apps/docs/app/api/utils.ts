import { type PostgrestError } from '@supabase/supabase-js'
import { type ZodError } from 'zod'

type ObjectOrNever = object | never

export type ApiErrorGeneric = ApiError<ObjectOrNever>

export class ApiError<Details extends ObjectOrNever = never> extends Error {
  constructor(
    message: string,
    public source?: unknown,
    public details?: Details
  ) {
    super(message)
  }

  isPrivate() {
    return true
  }

  isUserError() {
    return false
  }

  statusCode() {
    return 500
  }
}

export class InvalidRequestError<Details extends ObjectOrNever = never> extends ApiError<Details> {
  constructor(message: string, source?: unknown, details?: Details) {
    super(`Invalid request: ${message}`, source, details)
  }

  isPrivate() {
    return false
  }

  isUserError() {
    return true
  }

  statusCode() {
    return 400
  }
}

export class NoDataError<Details extends ObjectOrNever = never> extends ApiError<Details> {
  constructor(message: string, source?: unknown, details?: Details) {
    super(`Data not found: ${message}`, source, details)
  }

  isPrivate() {
    return false
  }

  isUserError() {
    return true
  }

  statusCode() {
    return 404
  }
}

export class CollectionQueryError extends Error {
  constructor(
    message: string,
    public readonly queryErrors: {
      count?: PostgrestError
      data?: PostgrestError
    }
  ) {
    super(message)
  }

  public static fromErrors(
    countError: PostgrestError | null,
    dataError: PostgrestError | null
  ): CollectionQueryError {
    const fetchFailedFor =
      countError && dataError ? 'count and collection' : countError ? 'count' : 'collection'
    return new CollectionQueryError(`Failed to fetch ${fetchFailedFor}`, {
      count: countError,
      data: dataError,
    })
  }
}

export function convertUnknownToApiError(error: unknown): ApiError {
  return new ApiError('Unknown error', error)
}

export function convertPostgrestToApiError(error: PostgrestError): ApiError {
  const message = `${error.code}: ${error.hint}`
  return new ApiError(message, error)
}

export function convertZodToInvalidRequestError(
  error: ZodError,
  prelude?: string
): InvalidRequestError {
  const issue = error.issues[0]
  const pathStr = issue.path.join('.')
  const message = `${prelude ? `${prelude}: ` : ''}${issue.message} at key "${pathStr}"`

  return new InvalidRequestError(message, error)
}
