import { describe, it, expect } from 'vitest';
import { ApiError, Errors } from '../../src/lib/errors.js';

describe('ApiError', () => {
  it('creates correct toResponse shape', () => {
    const err = new ApiError(400, 'TEST_ERROR', 'Something went wrong', { detail: 'info' });
    const response = err.toResponse();

    expect(response).toEqual({
      error: {
        code: 'TEST_ERROR',
        message: 'Something went wrong',
        context: { detail: 'info' },
      },
    });
  });

  it('omits context when not provided', () => {
    const err = new ApiError(400, 'TEST_ERROR', 'No context');
    const response = err.toResponse();

    expect(response).toEqual({
      error: {
        code: 'TEST_ERROR',
        message: 'No context',
      },
    });
  });
});

describe('Error Factories', () => {
  it('Errors.unauthorized creates 401', () => {
    const err = Errors.unauthorized();
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('UNAUTHORIZED');
    expect(err.message).toBe('Authentication required');
  });

  it('Errors.notFound creates 404', () => {
    const err = Errors.notFound('Builder');
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toBe('Builder not found');
    expect(err.toResponse().error.context).toEqual({ resource: 'Builder' });
  });

  it('Errors.badRequest creates 400', () => {
    const err = Errors.badRequest('Invalid input', { field: 'email' });
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('BAD_REQUEST');
    expect(err.message).toBe('Invalid input');
    expect(err.toResponse().error.context).toEqual({ field: 'email' });
  });

  it('Errors.insufficientCredits creates 400 with available/required context', () => {
    const err = Errors.insufficientCredits(5, 10);
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('INSUFFICIENT_CREDITS');
    expect(err.toResponse().error.context).toEqual({ available: 5, required: 10 });
  });
});
