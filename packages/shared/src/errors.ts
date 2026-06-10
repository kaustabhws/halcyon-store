export class DomainError extends Error {
  override readonly name: string = "DomainError";
  readonly code: string;
  readonly httpStatus: number;
  readonly details?: Record<string, unknown>;

  constructor(
    code: string,
    message: string,
    httpStatus = 400,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.code = code;
    this.httpStatus = httpStatus;
    this.details = details;
  }
}

export class NotFoundError extends DomainError {
  override readonly name = "NotFoundError";
  constructor(resource: string, id?: string) {
    super("not_found", `${resource}${id ? ` ${id}` : ""} not found`, 404);
  }
}

export class UnauthorizedError extends DomainError {
  override readonly name = "UnauthorizedError";
  constructor(message = "Unauthorized") {
    super("unauthorized", message, 401);
  }
}

export class ForbiddenError extends DomainError {
  override readonly name = "ForbiddenError";
  constructor(message = "Forbidden") {
    super("forbidden", message, 403);
  }
}

export class ValidationError extends DomainError {
  override readonly name = "ValidationError";
  constructor(message: string, details?: Record<string, unknown>) {
    super("validation_error", message, 422, details);
  }
}

export class ConflictError extends DomainError {
  override readonly name = "ConflictError";
  constructor(message: string) {
    super("conflict", message, 409);
  }
}
