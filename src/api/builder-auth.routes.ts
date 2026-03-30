import type { FastifyInstance, FastifyRequest } from 'fastify';
import { BuilderAuthService } from '../services/builder-auth.service.js';
import { Errors } from '../lib/errors.js';

export async function builderAuthRoutes(app: FastifyInstance) {
  // POST /auth/builder/signup
  app.post('/signup', async (request: FastifyRequest<{
    Body: { email: string; password: string; display_name: string };
  }>) => {
    const { email, password, display_name } = request.body;

    if (!email || !password || !display_name) {
      throw Errors.badRequest('email, password, and display_name are required');
    }

    try {
      const { builder, apiKey, token } = await BuilderAuthService.signup(email, password, display_name);
      return {
        builder: {
          id: builder.id,
          display_name: builder.display_name,
          email: builder.email,
          plan_tier: builder.plan_tier,
        },
        api_key: apiKey,
        token,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Signup failed';
      if (message.includes('already exists')) {
        throw Errors.conflict('EMAIL_EXISTS', message);
      }
      throw Errors.badRequest(message);
    }
  });

  // POST /auth/builder/login
  app.post('/login', async (request: FastifyRequest<{
    Body: { email: string; password: string };
  }>) => {
    const { email, password } = request.body;

    if (!email || !password) {
      throw Errors.badRequest('email and password are required');
    }

    try {
      const { builder, token } = await BuilderAuthService.login(email, password);
      return {
        builder: {
          id: builder.id,
          display_name: builder.display_name,
          email: builder.email,
          plan_tier: builder.plan_tier,
        },
        token,
      };
    } catch {
      throw Errors.unauthorized('Invalid email or password');
    }
  });

  // POST /auth/builder/forgot
  app.post('/forgot', async (request: FastifyRequest<{
    Body: { email: string };
  }>) => {
    const { email } = request.body;

    if (!email) {
      throw Errors.badRequest('email is required');
    }

    // Always return same message regardless of whether email exists
    await BuilderAuthService.forgotPassword(email);
    return { message: 'If account exists, reset link sent' };
  });

  // POST /auth/builder/reset
  app.post('/reset', async (request: FastifyRequest<{
    Body: { token: string; password: string };
  }>) => {
    const { token, password } = request.body;

    if (!token || !password) {
      throw Errors.badRequest('token and password are required');
    }

    try {
      await BuilderAuthService.resetPassword(token, password);
      return { message: 'Password reset successful' };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Reset failed';
      throw Errors.badRequest(message);
    }
  });

  // POST /auth/builder/verify
  app.post('/verify', async (request: FastifyRequest<{
    Body: { token: string };
  }>) => {
    const { token } = request.body;

    if (!token) {
      throw Errors.badRequest('token is required');
    }

    try {
      await BuilderAuthService.verifyEmail(token);
      return { message: 'Email verified' };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Verification failed';
      throw Errors.badRequest(message);
    }
  });

  // GET /auth/builder/me (requires JWT)
  app.get('/me', async (request: FastifyRequest) => {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw Errors.unauthorized('Missing authorization header');
    }

    const token = authHeader.slice(7);
    const payload = BuilderAuthService.verifyToken(token);

    if (!payload) {
      throw Errors.unauthorized('Invalid or expired token');
    }

    const builder = await BuilderAuthService.findById(payload.builderId);
    if (!builder) {
      throw Errors.unauthorized('Builder not found');
    }

    return {
      id: builder.id,
      display_name: builder.display_name,
      email: builder.email,
      plan_tier: builder.plan_tier,
      credits_balance: builder.credits_balance,
    };
  });
}
