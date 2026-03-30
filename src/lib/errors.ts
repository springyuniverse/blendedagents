import type { FastifyReply } from 'fastify';

export interface AppError {
  code: string;
  message: string;
  context?: Record<string, unknown>;
}

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly context?: Record<string, unknown>;

  constructor(statusCode: number, code: string, message: string, context?: Record<string, unknown>) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.context = context;
  }

  toResponse(): { error: AppError } {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.context && { context: this.context }),
      },
    };
  }
}

export function sendError(reply: FastifyReply, err: ApiError): void {
  reply.status(err.statusCode).send(err.toResponse());
}

// Common error factories
export const Errors = {
  unauthorized(message = 'Authentication required') {
    return new ApiError(401, 'UNAUTHORIZED', message);
  },

  forbidden(message = 'Access denied') {
    return new ApiError(403, 'FORBIDDEN', message);
  },

  notFound(resource: string) {
    return new ApiError(404, 'NOT_FOUND', `${resource} not found`, { resource });
  },

  badRequest(message: string, context?: Record<string, unknown>) {
    return new ApiError(400, 'BAD_REQUEST', message, context);
  },

  conflict(code: string, message: string, context?: Record<string, unknown>) {
    return new ApiError(409, code, message, context);
  },

  insufficientCredits(available: number, required: number) {
    return new ApiError(400, 'INSUFFICIENT_CREDITS', 'Insufficient credits for this operation', {
      available,
      required,
    });
  },

  invalidFilter(field: string, value: string, allowed: string[]) {
    return new ApiError(400, 'INVALID_FILTER', `Invalid ${field}: '${value}'. Must be one of: ${allowed.join(', ')}.`, {
      field,
      value,
    });
  },
};
