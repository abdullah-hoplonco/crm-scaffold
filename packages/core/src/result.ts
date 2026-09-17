/** Domain error codes. Handlers map them to HTTP status via `httpStatus`. */
export type DomainErrorCode =
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "VALIDATION"
  | "INVALID_PHONE"
  | "DUPLICATE_PHONE"
  | "INVALID_TRANSITION"
  | "LOST_REASON_REQUIRED"
  | "DISQUALIFY_REASON_REQUIRED"
  | "REOPEN_NOT_ALLOWED"
  | "LEAD_CLOSED"
  | "SERVICE_WINDOW_CLOSED"
  | "STAGE_NOT_EMPTY"
  | "STAGE_RULES"
  | "NO_ELIGIBLE_ASSIGNEE"
  | "QUOTE_NOT_EDITABLE";

export interface DomainError {
  code: DomainErrorCode;
  message: string;
  httpStatus: number;
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: DomainError };

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });

const STATUS: Record<DomainErrorCode, number> = {
  NOT_FOUND: 404,
  FORBIDDEN: 403,
  VALIDATION: 422,
  INVALID_PHONE: 422,
  DUPLICATE_PHONE: 409,
  INVALID_TRANSITION: 409,
  LOST_REASON_REQUIRED: 422,
  DISQUALIFY_REASON_REQUIRED: 422,
  REOPEN_NOT_ALLOWED: 403,
  LEAD_CLOSED: 409,
  SERVICE_WINDOW_CLOSED: 422,
  STAGE_NOT_EMPTY: 409,
  STAGE_RULES: 422,
  NO_ELIGIBLE_ASSIGNEE: 409,
  QUOTE_NOT_EDITABLE: 409,
};

export function fail<T = never>(code: DomainErrorCode, message: string): Result<T> {
  return { ok: false, error: { code, message, httpStatus: STATUS[code] } };
}
